import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Container, ContainerRepository } from './container-repository';

export class SqliteContainerRepository implements ContainerRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS containers (
        name TEXT PRIMARY KEY,
        isEnabled INTEGER NOT NULL,
        description TEXT NOT NULL,
        configuration TEXT NOT NULL
      )
    `);

    const columns = this.db.prepare(`PRAGMA table_info(containers)`).all() as { name: string }[];
    if (!columns.some(column => column.name === 'isEnabled')) {
      this.db.exec(`
        ALTER TABLE containers
        ADD COLUMN isEnabled INTEGER NOT NULL DEFAULT 1
      `);
    }
  }

  public async upsert(container: Container): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO containers (name, isEnabled, description, configuration)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        isEnabled = excluded.isEnabled,
        description = excluded.description,
        configuration = excluded.configuration
    `);
    statement.run(container.name, container.isEnabled ? 1 : 0, container.description, container.configuration);
  }

  public async tryGet(name: string): Promise<Container | null> {
    const statement = this.db.prepare(`
      SELECT name, isEnabled, description, configuration
      FROM containers
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(name) as
      | {
          name: string;
          isEnabled: number;
          description: string;
          configuration: string;
        }
      | undefined;

    return row ? new Container(row.name, row.isEnabled === 1, row.description, row.configuration) : null;
  }
}
