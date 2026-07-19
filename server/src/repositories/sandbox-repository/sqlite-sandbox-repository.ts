import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SandboxRepository } from './sandbox-repository';
import { Sandbox } from './sandbox';

export class SqliteSandboxRepository implements SandboxRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sandboxes (
        name TEXT PRIMARY KEY,
        isEnabled INTEGER NOT NULL,
        description TEXT NOT NULL,
        configuration TEXT NOT NULL,
        serializedSecrets TEXT NOT NULL,
        hash TEXT NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, sandbox: Sandbox): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO sandboxes (name, isEnabled, description, configuration, serializedSecrets, hash)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        isEnabled = excluded.isEnabled,
        description = excluded.description,
        configuration = excluded.configuration,
        serializedSecrets = excluded.serializedSecrets,
        hash = excluded.hash
    `);
    statement.run(
      sandbox.name,
      sandbox.isEnabled ? 1 : 0,
      sandbox.description,
      sandbox.configuration,
      JSON.stringify(sandbox.secrets),
      sandbox.hash
    );
  }

  public async tryGet(_: AbortSignal, name: string): Promise<Sandbox | null> {
    const statement = this.db.prepare(`
      SELECT name, isEnabled, description, configuration, serializedSecrets, hash
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
          serializedSecrets: string;
          hash: string;
        }
      | undefined;

    return row
      ? new Sandbox(
          row.name,
          row.isEnabled === 1,
          row.description,
          row.configuration,
          JSON.parse(row.serializedSecrets) as Record<string, string>,
          row.hash
        )
      : null;
  }
}
