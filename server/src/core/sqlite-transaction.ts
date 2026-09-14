import { DatabaseSync } from 'node:sqlite';
import { AsyncMutex } from './async-mutex';
import { Transaction } from './transaction';

export class SqliteTransaction {
  public static async begin(db: DatabaseSync, mutex: AsyncMutex, transaction?: Transaction): Promise<Transaction> {
    if (transaction && transaction.handler) {
      return Transaction.nop;
    }

    let created = false;
    if (!transaction) {
      transaction = Transaction.begin();
      created = true;
    }

    const release = await mutex.acquire();
    try {
      db.exec('BEGIN IMMEDIATE');
    } catch (e) {
      release();
      throw e;
    }

    // We must set the handler after the transaction is correctly created.
    transaction.handler = {
      commit: async () => {
        db.exec('COMMIT');
        release();
      },
      rollback: async () => {
        try {
          db.exec('ROLLBACK');
        } finally {
          release();
        }
      }
    };
    return created ? transaction : Transaction.nop;
  }
}
