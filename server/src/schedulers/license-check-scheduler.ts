import { LicenseManager } from '../configuration/license/license-manager';
import { Scheduler } from './scheduler';

const INTERVAL_MS = 24 * 60 * 60 * 1_000;

export class LicenseCheckScheduler implements Scheduler {
  private interval?: ReturnType<typeof setInterval>;

  public constructor(private readonly manager: LicenseManager) {}

  public start(): void {
    if (this.interval) {
      return;
    }
    const check = () => {
      void this.manager.validateOnBackground();
    };
    this.interval = setInterval(check, INTERVAL_MS);
    check();
  }

  public stop(): void {
    clearInterval(this.interval);
    this.manager.stopBackgroundValidation();
    this.interval = undefined;
  }
}
