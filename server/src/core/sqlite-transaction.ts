import { DatabaseSync } from 'node:sqlite';
import { Transaction } from './transaction';

export class SqliteTransaction {
  public static async begin(db: DatabaseSync, transaction?: Transaction): Promise<Transaction> {
    if (transaction && transaction.handler) {
      return Transaction.nop;
    }

    let created = false;
    if (!transaction) {
      transaction = Transaction.begin();
      created = true;
    }

    // TODO: add db mutex that stops other threads until this transaction is finished.

    db.exec('BEGIN IMMEDIATE');

    // We must set the handler after the transaction is correctly created.
    transaction.handler = {
      commit: async () => {
        db.exec('COMMIT');
      },
      rollback: async () => {
        db.exec('ROLLBACK');
      }
    };
    return created ? transaction : Transaction.nop;
  }
}
