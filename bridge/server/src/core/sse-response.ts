import type { Response } from 'express';

export class SseResponse {
  public constructor(private readonly res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  public writeEvent(payload: unknown): void {
    if (!this.res.writableEnded) {
      this.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  public end(): void {
    this.res.end();
  }

  public onClose(callback: () => void): void {
    this.res.on('close', callback);
  }
}
