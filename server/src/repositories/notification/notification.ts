import { randomUUID } from 'crypto';

export class Notification {
  public static create(userName: string, message: string): Notification {
    const id = randomUUID();
    return new Notification(id, userName, message, Date.now());
  }

  public constructor(
    public readonly id: string,
    public readonly userName: string,
    public readonly message: string,
    public readonly createdAt: number
  ) {}
}
