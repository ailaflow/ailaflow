import type { LlmCompletionUsage, LlmMessage, ToolDescriptor } from '@aibindkit/core';
import { LlmClient, LlmClientError, LlmCompleteResult, LlmModel, LlmModelSettings } from '../llm-client';
import { CodexAppServerConnection } from './codex-app-server-connection';
import { CodexDynamicToolBus } from './codex-dynamic-tool-bus';
import {
  dynamicToolsFingerprint,
  findLatestCodexThreadId,
  mapDynamicTools,
  projectHistory,
  readDeveloperInstructions,
  readLatestUserInput,
  readToolResults,
  withCodexThreadId
} from './codex-message-mapper';
import {
  CodexJsonObject,
  CodexJsonValue,
  CodexModel,
  CodexNotification,
  CodexThread,
  CodexTurn,
  isCodexJsonObject,
  readCodexDynamicToolCall
} from './codex-protocol';
import { attestRestrictedCodexThread, createRestrictedCodexConfig } from './codex-restricted-config';

interface CodexThreadRuntime {
  id: string;
  generation: number;
  dynamicToolsFingerprint: string;
  lastUsedAt: number;
}

interface CodexTurnResult {
  text: string;
  usage?: LlmCompletionUsage;
}

interface CodexActiveTurn {
  threadId: string;
  turnId: string;
  signal: AbortSignal;
  abortHandler: () => void;
  toolNames: Set<string>;
  text: string;
  returnedTextLength: number;
  usage?: LlmCompletionUsage;
  settled: boolean;
  completion: Promise<CodexTurnResult>;
  resolve(result: CodexTurnResult): void;
  reject(error: Error): void;
}

const maxLoadedThreads = 100;
const inactiveThreadTtlMs = 30 * 60_000;
const forbiddenServerRequestMessage = 'Codex attempted to invoke a native tool that AilaFlow did not provide';

export class CodexLlmClient implements LlmClient {
  private readonly connection: CodexAppServerConnection;
  private readonly toolBus = new CodexDynamicToolBus();
  private readonly threads = new Map<string, CodexThreadRuntime>();
  private readonly activeTurns = new Map<string, CodexActiveTurn>();
  private readonly threadLocks = new Map<string, Promise<void>>();
  private restrictedConfig?: { generation: number; promise: Promise<CodexJsonObject> };
  private disposed = false;

  public constructor(config: { url: string }) {
    this.connection = new CodexAppServerConnection(config.url);
    this.connection.setServerRequestHandler(request => this.handleServerRequest(request.method, request.params));
    this.connection.onNotification(notification => this.handleNotification(notification));
    this.connection.onClose(error => this.handleConnectionClose(error));
  }

  public async complete(
    signal: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult> {
    this.assertUsable();
    signal.throwIfAborted();
    const markerThreadId = findLatestCodexThreadId(messages);
    if (markerThreadId) {
      return this.withThreadLock(markerThreadId, () =>
        this.completeUnlocked(signal, modelSettings, messages, toolDescriptors, markerThreadId)
      );
    }
    return this.completeUnlocked(signal, modelSettings, messages, toolDescriptors, undefined);
  }

  private async completeUnlocked(
    signal: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined,
    markerThreadId: string | undefined
  ): Promise<LlmCompleteResult> {
    this.assertUsable();
    signal.throwIfAborted();
    await this.connection.connect();
    const dynamicTools = mapDynamicTools(toolDescriptors);
    const toolsFingerprint = dynamicToolsFingerprint(dynamicTools);

    if (markerThreadId) {
      const active = this.activeTurns.get(markerThreadId);
      if (active) {
        this.submitToolResults(active, messages);
        return this.waitForTurnResult(active, signal);
      }
    }

    const latestUser = readLatestUserInput(messages);
    const instructions = readDeveloperInstructions(messages);
    const thread = await this.ensureThread(
      signal,
      modelSettings.name,
      markerThreadId,
      toolsFingerprint,
      dynamicTools,
      instructions,
      messages,
      latestUser.index
    );
    const active = await this.startTurn(signal, thread.id, modelSettings.name, latestUser.text, dynamicTools);
    this.collectGarbage();
    return this.waitForTurnResult(active, signal);
  }

  public async getModels(signal: AbortSignal): Promise<LlmModel[]> {
    this.assertUsable();
    const response = await this.connection.request<unknown>('model/list', { limit: 100 }, signal);
    if (!isCodexJsonObject(response) || !Array.isArray(response.data)) {
      throw new LlmClientError('Codex app-server returned an invalid model list');
    }
    return response.data
      .filter(isCodexModel)
      .filter(model => model.hidden !== true)
      .map(model => ({ name: model.model ?? model.id }));
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const error = new LlmClientError('Codex LLM client was disposed');
    for (const active of this.activeTurns.values()) {
      this.failActiveTurn(active, error);
    }
    this.activeTurns.clear();
    this.threads.clear();
    this.threadLocks.clear();
    this.toolBus.dispose(error);
    this.connection.dispose();
  }

  private async ensureThread(
    signal: AbortSignal,
    model: string,
    markerThreadId: string | undefined,
    toolsFingerprint: string,
    dynamicTools: ReturnType<typeof mapDynamicTools>,
    developerInstructions: string,
    messages: LlmMessage[],
    latestUserIndex: number
  ): Promise<CodexThreadRuntime> {
    const loaded = markerThreadId ? this.threads.get(markerThreadId) : undefined;
    if (loaded && loaded.generation === this.connection.generation && loaded.dynamicToolsFingerprint === toolsFingerprint) {
      loaded.lastUsedAt = Date.now();
      return loaded;
    }

    if (markerThreadId && (!loaded || loaded.dynamicToolsFingerprint === toolsFingerprint)) {
      try {
        const resumed = await this.resumeThread(signal, markerThreadId, model, developerInstructions);
        const runtime = this.trackThread(resumed.id, toolsFingerprint);
        return runtime;
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        // An ephemeral thread can disappear when app-server restarts. Rebuild it from AilaFlow's transcript.
      }
    }

    const started = await this.startThread(signal, model, dynamicTools, developerInstructions);
    const history = projectHistory(messages, latestUserIndex);
    if (history.length > 0) {
      await this.connection.request('thread/inject_items', { threadId: started.id, items: history }, signal);
    }
    return this.trackThread(started.id, toolsFingerprint);
  }

  private async startThread(
    signal: AbortSignal,
    model: string,
    dynamicTools: ReturnType<typeof mapDynamicTools>,
    developerInstructions: string
  ): Promise<CodexThread> {
    const config = await this.getRestrictedConfig(signal);
    const response = await this.connection.request<unknown>(
      'thread/start',
      {
        model,
        baseInstructions: '',
        developerInstructions,
        approvalPolicy: 'never',
        sandbox: 'read-only',
        environments: [],
        dynamicTools,
        config,
        ephemeral: true
      },
      signal
    );
    const thread = readThreadResponse(response);
    await attestRestrictedCodexThread(this.connection, thread.id, signal);
    return thread;
  }

  private async resumeThread(signal: AbortSignal, threadId: string, model: string, developerInstructions: string): Promise<CodexThread> {
    const config = await this.getRestrictedConfig(signal);
    const response = await this.connection.request<unknown>(
      'thread/resume',
      {
        threadId,
        model,
        developerInstructions,
        approvalPolicy: 'never',
        sandbox: 'read-only',
        config,
        excludeTurns: true,
        initialTurnsPage: { limit: 1, sortDirection: 'desc', itemsView: 'notLoaded' }
      },
      signal
    );
    const thread = readThreadResponse(response);
    await attestRestrictedCodexThread(this.connection, thread.id, signal);
    return thread;
  }

  private async startTurn(
    signal: AbortSignal,
    threadId: string,
    model: string,
    prompt: string,
    dynamicTools: ReturnType<typeof mapDynamicTools>
  ): Promise<CodexActiveTurn> {
    if (this.activeTurns.has(threadId)) {
      throw new LlmClientError(`Codex thread ${threadId} already has an active turn`);
    }
    const response = await this.connection.request<unknown>(
      'turn/start',
      {
        threadId,
        model,
        input: [{ type: 'text', text: prompt }],
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
        environments: []
      },
      signal
    );
    const turn = readTurnResponse(response);
    const active = createActiveTurn(
      threadId,
      turn.id,
      signal,
      dynamicTools.map(tool => tool.name)
    );
    active.abortHandler = () => {
      const error = toAbortError(signal);
      void this.connection.request('turn/interrupt', { threadId, turnId: turn.id }).catch(() => undefined);
      this.failActiveTurn(active, error);
    };
    signal.addEventListener('abort', active.abortHandler, { once: true });
    this.activeTurns.set(threadId, active);
    return active;
  }

  private async waitForTurnResult(active: CodexActiveTurn, signal: AbortSignal): Promise<LlmCompleteResult> {
    const waitController = new AbortController();
    const waitSignal = AbortSignal.any([signal, waitController.signal]);
    try {
      const outcome = await Promise.race([
        active.completion.then(result => ({ kind: 'complete' as const, result })),
        this.toolBus.waitForCalls(waitSignal, active.threadId, active.turnId).then(calls => ({ kind: 'tools' as const, calls }))
      ]);
      waitController.abort();
      if (outcome.kind === 'tools') {
        const content = active.text.slice(active.returnedTextLength) || null;
        active.returnedTextLength = active.text.length;
        return {
          message: withCodexThreadId(
            {
              role: 'assistant',
              content,
              refusal: null,
              tool_calls: outcome.calls.map(call => ({
                id: call.callId,
                type: 'function',
                function: { name: call.tool, arguments: JSON.stringify(call.arguments) }
              }))
            },
            active.threadId
          )
        };
      }
      this.finishActiveTurn(active);
      return {
        message: withCodexThreadId(
          {
            role: 'assistant',
            content: outcome.result.text.slice(active.returnedTextLength) || null,
            refusal: null
          },
          active.threadId
        ),
        usage: outcome.result.usage
      };
    } finally {
      waitController.abort();
    }
  }

  private submitToolResults(active: CodexActiveTurn, messages: LlmMessage[]): void {
    for (const result of readToolResults(messages, active.threadId)) {
      if (this.toolBus.hasPendingCall(active.threadId, result.callId)) {
        this.toolBus.sendResult(active.threadId, result.callId, result.content);
      }
    }
  }

  private async handleServerRequest(method: string, params: unknown): Promise<CodexJsonValue | undefined> {
    if (method !== 'item/tool/call') {
      this.failMatchingActiveTurn(params, new LlmClientError(`${forbiddenServerRequestMessage}: ${method}`));
      return undefined;
    }
    const call = readCodexDynamicToolCall(params);
    if (!call) {
      throw new LlmClientError('Codex app-server sent an invalid dynamic tool call');
    }
    const active = this.activeTurns.get(call.threadId);
    if (!active || active.turnId !== call.turnId) {
      throw new LlmClientError(`Codex dynamic tool call does not belong to an active AilaFlow turn`);
    }
    if (!active.toolNames.has(call.tool)) {
      const error = new LlmClientError(`Codex requested unknown dynamic tool ${call.tool}`);
      this.failActiveTurn(active, error);
      throw error;
    }
    return (await this.toolBus.publishCall(active.signal, call)) as unknown as CodexJsonValue;
  }

  private handleNotification(notification: CodexNotification): void {
    const params = isCodexJsonObject(notification.params) ? notification.params : undefined;
    if (!params || typeof params.threadId !== 'string') {
      return;
    }
    const active = this.activeTurns.get(params.threadId);
    if (!active || (typeof params.turnId === 'string' && params.turnId !== active.turnId)) {
      return;
    }
    if (notification.method === 'item/agentMessage/delta' && typeof params.delta === 'string') {
      active.text += params.delta;
      return;
    }
    if (notification.method === 'item/completed' && isCodexJsonObject(params.item)) {
      this.handleCompletedItem(active, params.item);
      return;
    }
    if (notification.method === 'item/started' && isCodexJsonObject(params.item)) {
      this.assertAllowedItem(active, params.item);
      return;
    }
    if (notification.method === 'thread/tokenUsage/updated' && isCodexJsonObject(params.tokenUsage)) {
      active.usage = readUsage(params.tokenUsage);
      return;
    }
    if (notification.method === 'turn/completed' && isCodexJsonObject(params.turn)) {
      const status = params.turn.status;
      if (status === 'completed') {
        this.resolveActiveTurn(active);
      } else {
        const message = isCodexJsonObject(params.turn.error) ? params.turn.error.message : undefined;
        this.failActiveTurn(active, new LlmClientError(typeof message === 'string' ? message : `Codex turn ${String(status)}`));
      }
    }
  }

  private handleCompletedItem(active: CodexActiveTurn, item: CodexJsonObject): void {
    if (!this.assertAllowedItem(active, item)) {
      return;
    }
    if (item.type === 'agentMessage' && typeof item.text === 'string' && !active.text.endsWith(item.text)) {
      active.text += item.text;
    }
  }

  private assertAllowedItem(active: CodexActiveTurn, item: CodexJsonObject): boolean {
    const allowed = new Set(['userMessage', 'agentMessage', 'reasoning', 'dynamicToolCall']);
    if (typeof item.type !== 'string' || !allowed.has(item.type)) {
      const error = new LlmClientError(`${forbiddenServerRequestMessage}: ${String(item.type ?? 'unknown item')}`);
      this.failActiveTurn(active, error);
      return false;
    }
    return true;
  }

  private failMatchingActiveTurn(params: unknown, error: Error): void {
    if (!isCodexJsonObject(params) || typeof params.threadId !== 'string') {
      return;
    }
    const active = this.activeTurns.get(params.threadId);
    if (active) {
      this.failActiveTurn(active, error);
    }
  }

  private resolveActiveTurn(active: CodexActiveTurn): void {
    if (!active.settled) {
      active.settled = true;
      active.resolve({ text: active.text, usage: active.usage });
    }
  }

  private failActiveTurn(active: CodexActiveTurn, error: Error): void {
    if (!active.settled) {
      active.settled = true;
      active.reject(error);
    }
    this.toolBus.cancelThread(active.threadId, error);
    this.finishActiveTurn(active);
  }

  private finishActiveTurn(active: CodexActiveTurn): void {
    active.signal.removeEventListener('abort', active.abortHandler);
    if (this.activeTurns.get(active.threadId) === active) {
      this.activeTurns.delete(active.threadId);
    }
    const runtime = this.threads.get(active.threadId);
    if (runtime) {
      runtime.lastUsedAt = Date.now();
    }
  }

  private handleConnectionClose(error: Error): void {
    for (const active of [...this.activeTurns.values()]) {
      this.failActiveTurn(active, error);
    }
    this.threads.clear();
    this.restrictedConfig = undefined;
  }

  private async getRestrictedConfig(signal: AbortSignal): Promise<CodexJsonObject> {
    if (!this.restrictedConfig || this.restrictedConfig.generation !== this.connection.generation) {
      const entry = {
        generation: this.connection.generation,
        promise: createRestrictedCodexConfig(this.connection, signal)
      };
      entry.promise = entry.promise.catch(error => {
        if (this.restrictedConfig === entry) {
          this.restrictedConfig = undefined;
        }
        throw error;
      });
      this.restrictedConfig = entry;
    }
    return this.restrictedConfig.promise;
  }

  private trackThread(id: string, toolsFingerprint: string): CodexThreadRuntime {
    const runtime = {
      id,
      generation: this.connection.generation,
      dynamicToolsFingerprint: toolsFingerprint,
      lastUsedAt: Date.now()
    };
    this.threads.set(id, runtime);
    return runtime;
  }

  private collectGarbage(): void {
    const now = Date.now();
    const inactive = [...this.threads.values()]
      .filter(thread => !this.activeTurns.has(thread.id))
      .sort((left, right) => left.lastUsedAt - right.lastUsedAt);
    for (const thread of inactive) {
      if (now - thread.lastUsedAt < inactiveThreadTtlMs && this.threads.size <= maxLoadedThreads) {
        break;
      }
      this.threads.delete(thread.id);
      void this.connection.request('thread/unsubscribe', { threadId: thread.id }).catch(() => undefined);
    }
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new LlmClientError('Codex LLM client is disposed');
    }
  }

  private async withThreadLock<T>(threadId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.threadLocks.get(threadId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.threadLocks.set(threadId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.threadLocks.get(threadId) === queued) {
        this.threadLocks.delete(threadId);
      }
    }
  }
}

function createActiveTurn(threadId: string, turnId: string, signal: AbortSignal, toolNames: string[]): CodexActiveTurn {
  let resolve!: (result: CodexTurnResult) => void;
  let reject!: (error: Error) => void;
  const completion = new Promise<CodexTurnResult>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return {
    threadId,
    turnId,
    signal,
    abortHandler: () => undefined,
    toolNames: new Set(toolNames),
    text: '',
    returnedTextLength: 0,
    settled: false,
    completion,
    resolve,
    reject
  };
}

function readThreadResponse(response: unknown): CodexThread {
  if (!isCodexJsonObject(response) || !isCodexJsonObject(response.thread) || typeof response.thread.id !== 'string') {
    throw new LlmClientError('Codex app-server returned an invalid thread');
  }
  return { id: response.thread.id, ephemeral: response.thread.ephemeral === true };
}

function readTurnResponse(response: unknown): CodexTurn {
  if (!isCodexJsonObject(response) || !isCodexJsonObject(response.turn) || typeof response.turn.id !== 'string') {
    throw new LlmClientError('Codex app-server returned an invalid turn');
  }
  return { id: response.turn.id, status: typeof response.turn.status === 'string' ? response.turn.status : 'inProgress' };
}

function readUsage(tokenUsage: CodexJsonObject): LlmCompletionUsage | undefined {
  const usage = isCodexJsonObject(tokenUsage.last) ? tokenUsage.last : tokenUsage;
  const input = readNonNegativeNumber(usage.inputTokens);
  const output = readNonNegativeNumber(usage.outputTokens);
  const total = readNonNegativeNumber(usage.totalTokens) ?? (input !== undefined && output !== undefined ? input + output : undefined);
  if (input === undefined || output === undefined || total === undefined) {
    return undefined;
  }
  return { prompt_tokens: input, completion_tokens: output, total_tokens: total };
}

function readNonNegativeNumber(value: CodexJsonValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function isCodexModel(value: CodexJsonValue): value is CodexModel & CodexJsonObject {
  return isCodexJsonObject(value) && typeof value.id === 'string' && (value.model === undefined || typeof value.model === 'string');
}

function toAbortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new LlmClientError(String(signal.reason ?? 'Operation aborted'));
}
