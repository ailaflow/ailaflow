import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { KvConfiguration, KvConfigurationKey } from './kv-configuration';
import { KvConfigurationRepository } from './kv-configuration-repository';
import { AsyncMutex } from '../../../core/async-mutex';
import { SqliteTransaction } from '../../../core/sqlite-transaction';
import { Transaction } from '../../../core/transaction';

export class SqliteKvConfigurationRepository implements KvConfigurationRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
    this.dbMutex = dbs.modelDbMutex;
  }

  public async setup(abortSignal: AbortSignal): Promise<void> {
    abortSignal.throwIfAborted();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_configuration (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT
    `);
  }

  public async get(_: AbortSignal): Promise<KvConfiguration> {
    const rows = this.db.prepare('SELECT key, value FROM kv_configuration').all() as { key: string; value: string }[];
    const values = Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)])) as Partial<
      Pick<KvConfiguration, KvConfigurationKey>
    >;
    return new KvConfiguration(values.publicUrl ?? null, values.instanceId ?? null, values.licenseType ?? null, values.licenseKey ?? null);
  }

  public async updateChanged(abortSignal: AbortSignal, configuration: KvConfiguration, transaction?: Transaction): Promise<void> {
    abortSignal.throwIfAborted();
    const keys = configuration.getChangedKeys();
    if (keys.length === 0) {
      return;
    }
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const set = this.db.prepare(`
        INSERT INTO kv_configuration (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      const remove = this.db.prepare('DELETE FROM kv_configuration WHERE key = ?');
      for (const key of keys) {
        const value = configuration[key];
        if (value === null) {
          remove.run(key);
        } else {
          set.run(key, JSON.stringify(value));
        }
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
