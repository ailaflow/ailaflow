import { DatabaseSync } from 'node:sqlite';
import { UserAttributeValueType } from '@aila/model';
import { UserRepositoryError, UserRepository } from './user-repository';
import { User } from './user';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteUserRepository implements UserRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.userDb;
  }

  public async setup() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        isAdmin INTEGER NOT NULL
      ) STRICT
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_attributes (
        user_id TEXT NOT NULL,
        attribute_name TEXT NOT NULL,
        attribute_type INTEGER NOT NULL,
        value_string TEXT,
        value_integer INTEGER,
        value_boolean INTEGER,

        PRIMARY KEY (user_id, attribute_name),

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CHECK (
          (
            attribute_type = 1
            AND value_string IS NOT NULL
            AND value_integer IS NULL
            AND value_boolean IS NULL
          )
          OR
          (
            attribute_type = 2
            AND value_string IS NULL
            AND value_integer IS NOT NULL
            AND value_boolean IS NULL
          )
          OR
          (
            attribute_type = 3
            AND value_string IS NULL
            AND value_integer IS NULL
            AND value_boolean IS NOT NULL
          )
        )
      ) STRICT
    `);
  }

  public async tryGetUser(userName: string): Promise<User | null> {
    const statement = this.db.prepare(`
      SELECT id, name, passwordHash, isAdmin
      FROM users
      WHERE name = ?
      LIMIT 1
    `);
    const row = statement.get(userName) as
      | {
          id: string;
          name: string;
          passwordHash: string;
          isAdmin: number;
        }
      | undefined;
    if (!row) {
      return null;
    }
    return new User(row.id, row.name, row.passwordHash, row.isAdmin === 1, this.getAttributes(row.id));
  }

  public async tryGetById(id: string): Promise<User | null> {
    const statement = this.db.prepare(`
      SELECT id, name, passwordHash, isAdmin
      FROM users
      WHERE id = ?
      LIMIT 1
    `);
    const row = statement.get(id) as
      | {
          id: string;
          name: string;
          passwordHash: string;
          isAdmin: number;
        }
      | undefined;
    if (!row) {
      return null;
    }
    return new User(row.id, row.name, row.passwordHash, row.isAdmin === 1, this.getAttributes(row.id));
  }

  public async insert(user: User): Promise<void> {
    const insertUserStatement = this.db.prepare(`
      INSERT INTO users (id, name, passwordHash, isAdmin)
      VALUES (?, ?, ?, ?)
    `);
    try {
      this.db.exec(`BEGIN`);
      insertUserStatement.run(user.id, user.name, user.passwordHash, user.isAdmin ? 1 : 0);
      this.insertAttributes(user);
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      if (isDuplicateUserNameSqliteError(e)) {
        throw new UserRepositoryError('A user name is already in use');
      }
      throw e;
    }
  }

  public async update(user: User): Promise<void> {
    const updateUserStatement = this.db.prepare(`
      UPDATE users
      SET
        name = ?,
        passwordHash = ?,
        isAdmin = ?
      WHERE id = ?
    `);
    const deleteAttributesStatement = this.db.prepare(`
      DELETE FROM user_attributes
      WHERE user_id = ?
    `);
    try {
      this.db.exec(`BEGIN`);
      updateUserStatement.run(user.name, user.passwordHash, user.isAdmin ? 1 : 0, user.id);
      deleteAttributesStatement.run(user.id);
      this.insertAttributes(user);
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      if (isDuplicateUserNameSqliteError(e)) {
        throw new UserRepositoryError('A user name is already in use');
      }
      throw e;
    }
  }

  public async count(): Promise<number> {
    const statement = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM users
    `);
    const row = statement.get() as { count: number };
    return row.count;
  }

  private insertAttributes(user: User): void {
    const insertAttributeStatement = this.db.prepare(`
      INSERT INTO user_attributes (user_id, attribute_name, attribute_type, value_string, value_integer, value_boolean)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const [name, value] of Object.entries(user.attributes)) {
      const attribute = serializeAttributeValue(value);
      insertAttributeStatement.run(user.id, name, attribute.type, attribute.valueString, attribute.valueInteger, attribute.valueBoolean);
    }
  }

  private getAttributes(userId: string) {
    const statement = this.db.prepare(`
      SELECT attribute_name, attribute_type, value_string, value_integer, value_boolean
      FROM user_attributes
      WHERE user_id = ?
    `);
    const rows = statement.all(userId) as {
      attribute_name: string;
      attribute_type: UserAttributeValueType;
      value_string: string | null;
      value_integer: number | null;
      value_boolean: number | null;
    }[];

    return Object.fromEntries(
      rows.map(row => {
        switch (row.attribute_type) {
          case UserAttributeValueType.STRING:
            return [row.attribute_name, row.value_string!];
          case UserAttributeValueType.INTEGER:
            return [row.attribute_name, row.value_integer!];
          case UserAttributeValueType.BOOLEAN:
            return [row.attribute_name, row.value_boolean === 1];
          default:
            throw new UserRepositoryError(`Unsupported user attribute type: ${row.attribute_type}`);
        }
      })
    );
  }
}

function serializeAttributeValue(value: string | number | boolean): {
  type: UserAttributeValueType;
  valueString: string | null;
  valueInteger: number | null;
  valueBoolean: number | null;
} {
  switch (typeof value) {
    case 'string':
      return {
        type: UserAttributeValueType.STRING,
        valueString: value,
        valueInteger: null,
        valueBoolean: null
      };
    case 'number':
      if (!Number.isInteger(value)) {
        throw new UserRepositoryError('User attribute number value must be an integer');
      }
      return {
        type: UserAttributeValueType.INTEGER,
        valueString: null,
        valueInteger: value,
        valueBoolean: null
      };
    case 'boolean':
      return {
        type: UserAttributeValueType.BOOLEAN,
        valueString: null,
        valueInteger: null,
        valueBoolean: value ? 1 : 0
      };
  }
}

function isDuplicateUserNameSqliteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_SQLITE_ERROR' &&
    error.message.includes('UNIQUE constraint failed: users.name')
  );
}
