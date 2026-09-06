import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { KvConfiguration, KvConfigurationKey } from './kv-configuration';
import { KvConfigurationRepository } from './kv-configuration-repository';

export class SqliteKvConfigurationRepository implements KvConfigurationRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
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

  public async get(abortSignal: AbortSignal): Promise<KvConfiguration> {
    abortSignal.throwIfAborted();
    const rows = this.db.prepare('SELECT key, value FROM kv_configuration').all() as { key: string; value: string }[];
    const values = Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)])) as Partial<
      Pick<KvConfiguration, KvConfigurationKey>
    >;
    return new KvConfiguration(values.publicUrl ?? null, values.instanceId ?? null, values.licenseType ?? null, values.licenseKey ?? null);
  }

  public async updateChanged(abortSignal: AbortSignal, configuration: KvConfiguration): Promise<void> {
    abortSignal.throwIfAborted();
    const keys = configuration.getChangedKeys();
    if (keys.length === 0) return;
    const set = this.db.prepare(`
      INSERT INTO kv_configuration (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    const remove = this.db.prepare('DELETE FROM kv_configuration WHERE key = ?');
    this.db.exec('BEGIN');
    try {
      for (const key of keys) {
        const value = configuration[key];
        if (value === null) remove.run(key);
        else set.run(key, JSON.stringify(value));
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
