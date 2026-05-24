import { SseResponse } from './sse-response.mjs';

export default function setup(app) {
  const rpcMap = new Map();
  let lastId = 0;
  let listener = null;

  app.get('/rpc', (req, res) => {
    const sse = new SseResponse(res);

    function dropOutdatedRequests() {
      const now = Date.now();
      for (const [id, rpc] of rpcMap) {
        if (rpc.deadline < now) {
          rpcMap.delete(id);
          if (!rpc.res.writableEnded) {
            rpc.res.status(504).json({ error: 'Timeout' }).end();
          }
        }
      }
    }

    function sendPing() {
      sse.writeEvent({ ping: true });
    }

    const iv = setInterval(() => {
      dropOutdatedRequests();
      sendPing();
    }, 1_000);

    listener = rpc => {
      sse.writeEvent({
        rpc: {
          id: rpc.id,
          type: rpc.type,
          payload: rpc.payload
        }
      });
    };

    sse.onClose(() => {
      clearInterval(iv);
      listener = null;
    });
  });

  app.post('/rpc', (req, res) => {
    if (!listener) {
      res.status(503).json({ error: 'No listener' });
      return;
    }

    const id = ++lastId;
    const { type, payload } = req.body;
    const now = Date.now();
    const deadline = now + 8_000;
    const rpc = { id, type, payload, res, deadline };
    rpcMap.set(id, rpc);
    listener(rpc);
  });

  app.post('/rpc-response', (req, res) => {
    const { id, payload } = req.body;
    const request = rpcMap.get(id);
    if (!request) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    rpcMap.delete(id);

    if (!request.res.writableEnded) {
      request.res.json(payload).end();
    }

    res.json({ ok: true }).end();
  });
}
