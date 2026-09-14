export class AsyncMutex {
  private acquired = false;
  private readonly waiters: Array<() => void> = [];

  public async acquire(): Promise<() => void> {
    if (!this.acquired) {
      this.acquired = true;
    } else {
      await new Promise<void>(resolve => {
        this.waiters.push(resolve);
      });
    }

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.release();
    };
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }

    this.acquired = false;
  }
}
