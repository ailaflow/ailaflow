import type { ServerResponse } from 'node:http';

export class SseResponse<Update> {
  public constructor(private readonly res: ServerResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  public write(update: Update): void {
    if (!this.res.writableEnded) {
      this.res.write(`data: ${JSON.stringify(update)}\n\n`);
    }
  }

  public end(): void {
    this.res.end();
  }

  public onClose(callback: () => void): void {
    this.res.on('close', callback);
  }
}
