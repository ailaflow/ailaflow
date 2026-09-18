import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SandboxRepository } from './sandbox-repository';
import { Sandbox } from './sandbox';
import { Transaction } from '../../core/transaction';
import { Cipher } from '../../core/cipher/cipher';

export class SqliteSandboxRepository implements SandboxRepository {
  private readonly db: SqliteDatabase;

  public constructor(
    dbs: SqliteDatabases,
    private readonly cipher: Cipher
  ) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sandboxes (
          name TEXT PRIMARY KEY,
          isEnabled INTEGER NOT NULL,
          description TEXT NOT NULL,
          configuration TEXT NOT NULL,
          secrets TEXT NOT NULL,
          hash TEXT NOT NULL
        ) STRICT
      `);
    });
  }

  public async upsert(_: AbortSignal, sandbox: Sandbox, transaction?: Transaction): Promise<void> {
    const encryptedSecrets = await this.cipher.encryptData(JSON.stringify(sandbox.secrets));
    await this.db.write(db => {
      const statement = db.prepare(`
        INSERT INTO sandboxes (name, isEnabled, description, configuration, secrets, hash)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          isEnabled = excluded.isEnabled,
          description = excluded.description,
          configuration = excluded.configuration,
          secrets = excluded.secrets,
          hash = excluded.hash
      `);
      statement.run(sandbox.name, sandbox.isEnabled ? 1 : 0, sandbox.description, sandbox.configuration, encryptedSecrets, sandbox.hash);
    }, transaction);
  }

  public async tryGet(_: AbortSignal, name: string): Promise<Sandbox | null> {
    const row = await this.db.read(db => {
      const statement = db.prepare(`
        SELECT name, isEnabled, description, configuration, secrets, hash
        FROM sandboxes
        WHERE name = ?
        LIMIT 1
      `);
      const row = statement.get(name) as
        | {
            name: string;
            isEnabled: number;
            description: string;
            configuration: string;
            secrets: string;
            hash: string;
          }
        | undefined;

      return row ?? null;
    });

    if (row === null) {
      return null;
    }

    const secrets = JSON.parse(await this.cipher.decryptData(row.secrets)) as Record<string, string>;
    return new Sandbox(row.name, row.isEnabled === 1, row.description, row.configuration, secrets, row.hash);
  }
}
