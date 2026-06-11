import { Response } from 'express';

export class SseResponse<T> {
  private readonly iv: ReturnType<typeof setInterval>;

  public constructor(private readonly res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    this.iv = setInterval(() => this.res.write('\n'), 2_000);
    this.res.on('close', () => clearInterval(this.iv));
  }

  public onClose(listener: () => void) {
    this.res.on('close', listener);
  }

  public send(data: T) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
