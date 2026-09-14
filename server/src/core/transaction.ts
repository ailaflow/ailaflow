export class Transaction {
  public static begin(): Transaction {
    return new Transaction(null);
  }

  public static nop: Transaction = new Transaction({
    commit: async () => {},
    rollback: async () => {}
  });

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
