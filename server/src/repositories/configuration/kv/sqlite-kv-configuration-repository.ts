import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { KvConfiguration, KvConfigurationKey } from './kv-configuration';
import { KvConfigurationRepository } from './kv-configuration-repository';
import { Transaction } from '../../../core/transaction';

export class SqliteKvConfigurationRepository implements KvConfigurationRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'kv_configuration', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE kv_configuration (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          ) STRICT
        `);
      }
    });
  }

  public async get(_: AbortSignal): Promise<KvConfiguration> {
    return this.db.read(db => {
      const rows = db.prepare('SELECT key, value FROM kv_configuration').all() as { key: string; value: string }[];
      const values = Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)])) as Partial<
        Pick<KvConfiguration, KvConfigurationKey>
      >;
      return new KvConfiguration(
        values.publicUrl ?? null,
        values.instanceId ?? null,
        values.licenseType ?? null,
        values.licenseKey ?? null
      );
    });
  }

  public async updateChanged(_: AbortSignal, configuration: KvConfiguration, transaction?: Transaction): Promise<void> {
    const keys = configuration.getChangedKeys();
    if (keys.length === 0) {
      return;
    }
    await this.db.write(db => {
      const set = db.prepare(`
        INSERT INTO kv_configuration (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      const remove = db.prepare('DELETE FROM kv_configuration WHERE key = ?');
      for (const key of keys) {
        const value = configuration[key];
        if (value === null) {
          remove.run(key);
        } else {
          set.run(key, JSON.stringify(value));
        }
      }
    }, transaction);
  }
}
