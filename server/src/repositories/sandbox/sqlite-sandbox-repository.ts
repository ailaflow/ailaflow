import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SandboxRepository, SandboxRepositoryError } from './sandbox-repository';
import { Sandbox } from './sandbox';
import { Transaction } from '../../core/transaction';
import { Cipher } from '../../core/cipher/cipher';

interface SandboxRow {
  name: string;
  token: string;
  isEnabled: number;
  description: string;
  configuration: string;
  secrets: string;
  hash: string;
}

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
          token TEXT NOT NULL UNIQUE,
          isEnabled INTEGER NOT NULL,
          description TEXT NOT NULL,
          configuration TEXT NOT NULL,
          secrets TEXT NOT NULL,
          hash TEXT NOT NULL
        ) STRICT
      `);
    });
  }

  public async insert(_: AbortSignal, sandbox: Sandbox, transaction?: Transaction): Promise<void> {
    const encryptedSecrets = await this.cipher.encryptData(JSON.stringify(sandbox.secrets));
    try {
      await this.db.write(db => {
        const statement = db.prepare(`
          INSERT INTO sandboxes (name, token, isEnabled, description, configuration, secrets, hash)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        statement.run(
          sandbox.name,
          sandbox.token,
          sandbox.isEnabled ? 1 : 0,
          sandbox.description,
          sandbox.configuration,
          encryptedSecrets,
          sandbox.hash
        );
      }, transaction);
    } catch (e) {
      if (isDuplicateSandboxNameSqliteError(e)) {
        throw new SandboxRepositoryError('A sandbox name is already in use');
      }
      throw e;
    }
  }

  public async update(_: AbortSignal, sandbox: Sandbox, transaction?: Transaction): Promise<void> {
    const encryptedSecrets = await this.cipher.encryptData(JSON.stringify(sandbox.secrets));
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE sandboxes
        SET
          isEnabled = ?,
          description = ?,
          configuration = ?,
          secrets = ?,
          hash = ?
        WHERE name = ?
      `);
      statement.run(sandbox.isEnabled ? 1 : 0, sandbox.description, sandbox.configuration, encryptedSecrets, sandbox.hash, sandbox.name);
    }, transaction);
  }

  public async tryGet(_: AbortSignal, name: string): Promise<Sandbox | null> {
    const row = await this.db.read(db => {
      const statement = db.prepare(`
        SELECT name, token, isEnabled, description, configuration, secrets, hash
        FROM sandboxes
        WHERE name = ?
        LIMIT 1
      `);
      const row = statement.get(name) as SandboxRow | undefined;

      return row ?? null;
    });

    if (row === null) {
      return null;
    }

    const secrets = JSON.parse(await this.cipher.decryptData(row.secrets)) as Record<string, string>;
    return new Sandbox(row.name, row.token, row.isEnabled === 1, row.description, row.configuration, secrets, row.hash);
  }
}

function isDuplicateSandboxNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: sandboxes.name')
  );
}
