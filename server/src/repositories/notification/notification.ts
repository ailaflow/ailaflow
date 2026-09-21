import { randomUUID } from 'crypto';

export class Notification {
  public static create(processName: string, userName: string, message: string): Notification {
    const id = randomUUID();
    return new Notification(id, processName, userName, message, Date.now());
  }

  public constructor(
    public readonly id: string,
    public readonly processName: string,
    public readonly userName: string,
    public readonly message: string,
    public readonly createdAt: number
  ) {}
}
