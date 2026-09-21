import type { HttpResponse, HttpServer } from '../core/http-server';
import { SseResponse } from '../core/sse-response';
import { TokenMiddleware } from '../core/token-middleware';

interface Rpc {
  callId: number;
  executionId: string;
  methodName: string;
  res: HttpResponse;
  timeout: number;
  deadline: number;
}

interface ExecuteRpcRequest {
  methodName: string;
  executionId: string;
  data: unknown;
  timeout: number;
}

interface SendRpcReplyRequest {
  callId: number;
  data?: unknown;
  error?: string;
}

interface ListenRpcUpdate {
  ping?: 1;
  rpc?: {
    callId: number;
    methodName: string;
    executionId: string;
    data: unknown;
    timeout: number;
  };
}

const MAX_TIMEOUT = 60_000;

export function setupRpcEndpoints(app: HttpServer, tokenMiddleware: TokenMiddleware): void {
  const rpcs = new Map<number, Rpc>();
  let lastCallId = 0;
  let listener: ((rpc: Rpc, data: unknown) => void) | null = null;

  app.get('/rpc', (req, res) => {
    tokenMiddleware.assert(req);

    const sse = new SseResponse<ListenRpcUpdate>(res);

    function dropOutdatedRequests(): void {
      const now = Date.now();
      for (const [id, rpc] of rpcs) {
        if (rpc.deadline < now) {
          rpcs.delete(id);
          if (!rpc.res.writableEnded) {
            rpc.res.json(504, { error: 'Timeout' });
          }
        }
      }
    }

    function sendPing(): void {
      sse.write({ ping: 1 });
    }

    const interval = setInterval(() => {
      dropOutdatedRequests();
      sendPing();
    }, 1_000);

    listener = (rpc, data) => {
      sse.write({
        rpc: {
          callId: rpc.callId,
          executionId: rpc.executionId,
          methodName: rpc.methodName,
          timeout: rpc.timeout,
          data
        }
      });
    };

    sse.onClose(() => {
      clearInterval(interval);
      listener = null;
    });
  });

  app.post<ExecuteRpcRequest>('/rpc', (req, res) => {
    if (!listener) {
      res.json(503, { error: 'No listener' });
      return;
    }

    const callId = ++lastCallId;
    const { methodName, executionId, data, timeout } = req.body;
    const now = Date.now();
    const deadline = now + Math.min(timeout, MAX_TIMEOUT);
    const rpc = { callId, methodName, executionId, res, timeout, deadline };
    rpcs.set(callId, rpc);
    listener(rpc, data);
  });

  app.post<SendRpcReplyRequest>('/rpc-reply', (req, res) => {
    tokenMiddleware.assert(req);

    const { callId, data, error } = req.body;
    const rpc = rpcs.get(callId);
    if (!rpc) {
      res.json(404, { error: 'Not found' });
      return;
    }

    rpcs.delete(callId);

    if (!rpc.res.writableEnded) {
      if (data !== undefined) {
        rpc.res.json(200, data);
      } else {
        rpc.res.json(500, { error: error ?? 'Incorrect reply' });
      }
    }

    res.json(200, { ok: true });
  });
}
