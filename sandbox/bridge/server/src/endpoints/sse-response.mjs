export class SseResponse {
  /**
   * @param {import('express').Response} res
   */
  constructor(res) {
    this.res = res;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  writeEvent(payload) {
    if (!this.res.writableEnded) {
      this.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  end() {
    this.res.end();
  }

  onClose(callback) {
    this.res.on('close', callback);
  }
}
