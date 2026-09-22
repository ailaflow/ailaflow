import { LlmClientError } from '../llm-client';
import { CodexJsonValue, CodexNotification, CodexRequestId, CodexServerRequest, isCodexJsonObject } from './codex-protocol';

type CodexWebSocketFactory = (url: string) => WebSocket;
type CodexServerRequestHandler = (request: CodexServerRequest) => Promise<CodexJsonValue | undefined>;
type CodexNotificationHandler = (notification: CodexNotification) => void;
type CodexCloseHandler = (error: Error) => void;

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  cleanup(): void;
}

const requestTimeoutMs = 60_000;

export class CodexAppServerConnection {
  private socket?: WebSocket;
  private connecting?: Promise<void>;
  private disposed = false;
  private nextRequestId = 1;
  private readonly pendingRequests = new Map<CodexRequestId, PendingRequest>();
  private readonly notificationHandlers = new Set<CodexNotificationHandler>();
  private readonly closeHandlers = new Set<CodexCloseHandler>();
  private serverRequestHandler?: CodexServerRequestHandler;

  public generation = 0;

  public constructor(
    private readonly url: string,
    private readonly webSocketFactory: CodexWebSocketFactory = createNativeWebSocket
  ) {}

  public setServerRequestHandler(handler: CodexServerRequestHandler): void {
    this.serverRequestHandler = handler;
  }

  public onNotification(handler: CodexNotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  public onClose(handler: CodexCloseHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  public async connect(): Promise<void> {
    if (this.disposed) {
      throw new LlmClientError('Codex app-server client is disposed');
    }
    if (this.socket?.readyState === 1) {
      return;
    }
    if (!this.connecting) {
      this.connecting = this.openAndInitialize().finally(() => {
        this.connecting = undefined;
      });
    }
    return this.connecting;
  }

  public async request<T>(method: string, params?: unknown, signal?: AbortSignal): Promise<T> {
    await this.connect();
    return this.sendRequest<T>(method, params, signal);
  }

  public notify(method: string, params?: unknown): void {
    this.send({ method, ...(params === undefined ? {} : { params }) });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const error = new LlmClientError('Codex app-server client was disposed');
    this.rejectPendingRequests(error);
    this.socket?.close(1000, 'AilaFlow client disposed');
    this.socket = undefined;
  }

  private async openAndInitialize(): Promise<void> {
    const socket = this.webSocketFactory(this.url);
    this.socket = socket;
    socket.addEventListener('message', event => void this.handleMessage(event.data));
    socket.addEventListener('close', event => this.handleClose(socket, event));
    socket.addEventListener('error', () => this.handleSocketError(socket));

    try {
      await waitForOpen(socket);
      await this.sendRequest('initialize', {
        clientInfo: {
          name: 'ailaflow',
          title: 'AilaFlow',
          version: '0.0.0'
        },
        capabilities: {
          experimentalApi: true
        }
      });
      this.send({ method: 'initialized', params: {} });
      this.generation++;
    } catch (error) {
      if (this.socket === socket) {
        this.socket = undefined;
        socket.close();
      }
      throw error;
    }
  }

  private sendRequest<T>(method: string, params?: unknown, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(toAbortError(signal));
    }
    const id = this.nextRequestId++;
    return new Promise<T>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const abort = () => {
        this.pendingRequests.delete(id);
        cleanup();
        reject(toAbortError(signal));
      };
      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        signal?.removeEventListener('abort', abort);
      };
      timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        cleanup();
        reject(new LlmClientError(`Codex app-server request ${method} timed out`));
      }, requestTimeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      this.pendingRequests.set(id, {
        resolve: value => resolve(value as T),
        reject,
        cleanup
      });
      try {
        this.send({ method, id, ...(params === undefined ? {} : { params }) });
      } catch (error) {
        this.pendingRequests.delete(id);
        cleanup();
        reject(toError(error));
      }
    });
  }

  private send(message: object): void {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new LlmClientError('Codex app-server WebSocket is not connected');
    }
    this.socket.send(JSON.stringify(message));
  }

  private async handleMessage(data: unknown): Promise<void> {
    let message: unknown;
    try {
      message = JSON.parse(await readMessageData(data));
    } catch {
      return;
    }
    if (!isCodexJsonObject(message)) {
      return;
    }
    if ('id' in message && !('method' in message)) {
      this.handleResponse(message);
      return;
    }
    if (typeof message.method !== 'string') {
      return;
    }
    if ('id' in message && (typeof message.id === 'number' || typeof message.id === 'string')) {
      void this.handleServerRequest({ id: message.id, method: message.method, params: message.params });
      return;
    }
    for (const handler of this.notificationHandlers) {
      handler({ method: message.method, params: message.params });
    }
  }

  private handleResponse(message: Record<string, unknown>): void {
    const id = message.id;
    if (typeof id !== 'number' && typeof id !== 'string') {
      return;
    }
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(id);
    pending.cleanup();
    if (message.error !== undefined) {
      pending.reject(new LlmClientError(readRpcError(message.error)));
    } else {
      pending.resolve(message.result);
    }
  }

  private async handleServerRequest(request: CodexServerRequest): Promise<void> {
    try {
      const result = await this.serverRequestHandler?.(request);
      if (result === undefined) {
        this.send({ id: request.id, error: { code: -32601, message: `Unsupported server request ${request.method}` } });
      } else {
        this.send({ id: request.id, result });
      }
    } catch (error) {
      try {
        this.send({ id: request.id, error: { code: -32000, message: toError(error).message } });
      } catch {
        // The socket failure path rejects active turns and pending requests.
      }
    }
  }

  private handleSocketError(socket: WebSocket): void {
    if (socket !== this.socket) {
      return;
    }
    this.failConnection(new LlmClientError('Codex app-server WebSocket failed'));
    socket.close();
  }

  private handleClose(socket: WebSocket, event: CloseEvent): void {
    if (socket !== this.socket) {
      return;
    }
    const detail = event.reason ? `: ${event.reason}` : '';
    this.failConnection(new LlmClientError(`Codex app-server WebSocket closed (${event.code})${detail}`));
  }

  private failConnection(error: Error): void {
    this.socket = undefined;
    this.rejectPendingRequests(error);
    for (const handler of this.closeHandlers) {
      handler(error);
    }
  }

  private rejectPendingRequests(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      pending.cleanup();
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

function createNativeWebSocket(url: string): WebSocket {
  if (typeof WebSocket === 'undefined') {
    throw new LlmClientError('Codex app-server requires a Node.js runtime with native WebSocket support');
  }
  return new WebSocket(url);
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const opened = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new LlmClientError('Could not connect to Codex app-server WebSocket'));
    };
    const cleanup = () => {
      socket.removeEventListener('open', opened);
      socket.removeEventListener('error', failed);
    };
    socket.addEventListener('open', opened, { once: true });
    socket.addEventListener('error', failed, { once: true });
  });
}

async function readMessageData(data: unknown): Promise<string> {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof Blob) {
    return data.text();
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }
  return String(data);
}

function readRpcError(value: unknown): string {
  if (isCodexJsonObject(value) && typeof value.message === 'string') {
    return value.message;
  }
  return `Codex app-server request failed: ${JSON.stringify(value)}`;
}

function toAbortError(signal?: AbortSignal): Error {
  return signal?.reason instanceof Error ? signal.reason : new LlmClientError('Operation aborted');
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
