interface ThrottlerItem {
  ip: string;
  attempt: number;
  nextAttemptAt: number;
  cleanupAt: number;
}

export class LoginThrottler {
  private readonly items = new Map<string, ThrottlerItem>();

  private iv: ReturnType<typeof setInterval> | null = null;

  public start() {
    this.iv = setInterval(() => {
      const now = Date.now();
      for (const [ip, item] of this.items.entries()) {
        if (item.cleanupAt <= now) {
          this.items.delete(ip);
        }
      }
    }, 60 * 1000);
  }

  public stop() {
    if (this.iv) {
      clearInterval(this.iv);
      this.iv = null;
    }
  }

  public tryConsumeAttempt(ip: string): boolean {
    const now = Date.now();
    const item = this.items.get(ip);
    if (item && item.nextAttemptAt > now) {
      return false;
    }
    const attempt = item ? item.attempt + 1 : 1;
    const nextAttemptAt = calcNextAttemptAt(attempt, now);
    const cleanupAt = calcCleanupAt(now);
    this.items.set(ip, { ip, attempt, nextAttemptAt, cleanupAt });
    return true;
  }
}

function calcNextAttemptAt(attempt: number, now: number) {
  const delay = Math.min(Math.round(90 * Math.pow(10 / 3, attempt - 1)), 10 * 60_000);
  return now + delay;
}

function calcCleanupAt(now: number) {
  return now + 10 * 60 * 1000;
}
