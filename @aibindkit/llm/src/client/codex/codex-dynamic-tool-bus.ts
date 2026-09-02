import { LlmClientError } from '../llm-client';
import { CodexDynamicToolCall, CodexDynamicToolResponse } from './codex-protocol';

interface PendingCall {
  call: CodexDynamicToolCall;
  delivered: boolean;
  promise: Promise<CodexDynamicToolResponse>;
  resolve(response: CodexDynamicToolResponse): void;
  reject(error: Error): void;
}

interface CallWaiter {
  turnId: string;
  resolve(calls: CodexDynamicToolCall[]): void;
  reject(error: Error): void;
  cleanup(): void;
}

export class CodexDynamicToolBus {
  private readonly pendingCalls = new Map<string, PendingCall>();
  private readonly earlyResults = new Map<string, CodexDynamicToolResponse>();
  private readonly callWaiters = new Map<string, CallWaiter>();

  public publishCall(abortSignal: AbortSignal, call: CodexDynamicToolCall): Promise<CodexDynamicToolResponse> {
    const key = getCallKey(call.threadId, call.callId);
    const existing = this.pendingCalls.get(key);
    if (existing) {
      return existing.promise;
    }
    const early = this.earlyResults.get(key);
    if (early) {
      this.earlyResults.delete(key);
      return Promise.resolve(early);
    }

    let resolve!: (response: CodexDynamicToolResponse) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<CodexDynamicToolResponse>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });
    const pending: PendingCall = { call, delivered: false, promise, resolve, reject };
    this.pendingCalls.set(key, pending);

    const abort = () => {
      if (this.pendingCalls.delete(key)) {
        reject(toAbortError(abortSignal));
      }
    };
    abortSignal.addEventListener('abort', abort, { once: true });
    void promise.finally(() => abortSignal.removeEventListener('abort', abort)).catch(() => undefined);

    this.notifyCallWaiter(call.threadId);
    return promise;
  }

  public waitForCalls(abortSignal: AbortSignal, threadId: string, turnId: string): Promise<CodexDynamicToolCall[]> {
    const ready = this.takeReadyCalls(threadId, turnId);
    if (ready.length > 0) {
      return Promise.resolve(ready);
    }
    if (this.callWaiters.has(threadId)) {
      return Promise.reject(new LlmClientError(`Codex dynamic tool calls are already being awaited for thread ${threadId}`));
    }
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.callWaiters.delete(threadId);
        reject(toAbortError(abortSignal));
      };
      const cleanup = () => abortSignal.removeEventListener('abort', abort);
      if (abortSignal.aborted) {
        abort();
        return;
      }
      abortSignal.addEventListener('abort', abort, { once: true });
      this.callWaiters.set(threadId, { turnId, resolve, reject, cleanup });
    });
  }

  public sendResult(threadId: string, callId: string, content: string, success = true): boolean {
    const key = getCallKey(threadId, callId);
    const response: CodexDynamicToolResponse = {
      contentItems: [{ type: 'inputText', text: content }],
      success
    };
    const pending = this.pendingCalls.get(key);
    if (pending) {
      this.pendingCalls.delete(key);
      pending.resolve(response);
      return true;
    }
    if (this.earlyResults.has(key)) {
      throw new LlmClientError(`Codex dynamic tool result was already supplied for call ${callId}`);
    }
    this.earlyResults.set(key, response);
    return false;
  }

  public hasPendingCall(threadId: string, callId: string): boolean {
    return this.pendingCalls.has(getCallKey(threadId, callId));
  }

  public cancelThread(threadId: string, error: Error): void {
    const prefix = `${threadId}:`;
    for (const [key, pending] of this.pendingCalls) {
      if (key.startsWith(prefix)) {
        this.pendingCalls.delete(key);
        pending.reject(error);
      }
    }
    for (const key of this.earlyResults.keys()) {
      if (key.startsWith(prefix)) {
        this.earlyResults.delete(key);
      }
    }
    const waiter = this.callWaiters.get(threadId);
    if (waiter) {
      this.callWaiters.delete(threadId);
      waiter.cleanup();
      waiter.reject(error);
    }
  }

  public dispose(error = new LlmClientError('Codex dynamic tool bus was disposed')): void {
    const threadIds = new Set<string>();
    for (const pending of this.pendingCalls.values()) {
      threadIds.add(pending.call.threadId);
    }
    for (const threadId of this.callWaiters.keys()) {
      threadIds.add(threadId);
    }
    for (const threadId of threadIds) {
      this.cancelThread(threadId, error);
    }
    this.earlyResults.clear();
  }

  private notifyCallWaiter(threadId: string): void {
    const waiter = this.callWaiters.get(threadId);
    if (!waiter) {
      return;
    }
    const calls = this.takeReadyCalls(threadId, waiter.turnId);
    if (calls.length === 0) {
      return;
    }
    this.callWaiters.delete(threadId);
    waiter.cleanup();
    waiter.resolve(calls);
  }

  private takeReadyCalls(threadId: string, turnId: string): CodexDynamicToolCall[] {
    const calls: CodexDynamicToolCall[] = [];
    for (const pending of this.pendingCalls.values()) {
      if (pending.call.threadId === threadId && pending.call.turnId === turnId && !pending.delivered) {
        pending.delivered = true;
        calls.push(pending.call);
      }
    }
    return calls;
  }
}

function getCallKey(threadId: string, callId: string): string {
  return `${threadId}:${callId}`;
}

function toAbortError(abortSignal: AbortSignal): Error {
  return abortSignal.reason instanceof Error ? abortSignal.reason : new LlmClientError('Operation aborted');
}
