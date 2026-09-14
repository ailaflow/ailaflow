export class Transaction {
  public static begin(): Transaction {
    return new Transaction(null);
  }

  public db: unknown | null = null;

  public constructor(
    public handler: {
      commit: () => Promise<void>;
      rollback: () => Promise<void>;
    } | null
  ) {}

  public async commit() {
    if (this.handler) {
      await this.handler.commit();
    }
  }

  public async rollback() {
    if (this.handler) {
      await this.handler.rollback();
    }
  }
}
