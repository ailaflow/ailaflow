import { DatabaseSync } from 'node:sqlite';
import { ServerPaths } from '../../core/server-paths';
import path from 'path';
import { User, UserRepository } from './user-repository';

export class SqliteUserRepository implements UserRepository {
  private readonly db: DatabaseSync;

  public constructor(serverPaths: ServerPaths) {
    const dataFolderPath = serverPaths.getDataFolderPath();
    const dbPath = path.join(dataFolderPath, 'users.db');
    this.db = new DatabaseSync(dbPath, {
      open: true
    });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        name TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        isAdmin INTEGER NOT NULL
      )
    `);
  }

  public async tryGetUser(userName: string): Promise<User | null> {
    const statement = this.db.prepare(`
      SELECT name, passwordHash, isAdmin
      FROM users
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(userName) as
      | {
          name: string;
          passwordHash: string;
          isAdmin: number;
        }
      | undefined;
    return row ? new User(row.name, row.passwordHash, row.isAdmin === 1) : null;
  }

  public async insert(user: User): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO users (name, passwordHash, isAdmin)
      VALUES (?, ?, ?)
    `);
    statement.run(user.name, user.passwordHash, user.isAdmin ? 1 : 0);
  }

  public async count(): Promise<number> {
    const statement = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM users
    `);
    const row = statement.get() as { count: number };
    return row.count;
  }

  public dispose() {
    this.db.close();
  }
}
