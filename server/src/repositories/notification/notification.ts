import { randomBytes } from 'crypto';

export class Notification {
  public static create(userName: string, message: string): Notification {
    return new Notification(randomBytes(24).toString('hex'), userName, message, Date.now());
  }

  public constructor(
    public readonly id: string,
    public readonly userName: string,
    public readonly message: string,
    public readonly createdAt: number
  ) {}
}
