import { randomUUID } from 'crypto';

export class Notification {
  public static create(userName: string, processName: string | null, message: string): Notification {
    const id = randomUUID();
    return new Notification(id, userName, processName, message, Date.now());
  }

  public constructor(
    public readonly id: string,
    public readonly userName: string,
    public readonly processName: string | null,
    public readonly message: string,
    public readonly createdAt: number
  ) {}
}
