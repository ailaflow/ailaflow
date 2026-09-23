import { DatabaseSync } from 'node:sqlite';
import { UserAttributeValueType } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserAttributesRepository, UserAttributesRepositoryError } from './user-attributes-repository';
import { UserAttributes } from './user-attributes';
import { Transaction } from '../../core/transaction';

export class SqliteUserAttributesRepository implements UserAttributesRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.setup(1, 'user_attribute_definitions', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE user_attribute_definitions (
            attribute_name TEXT PRIMARY KEY,
            attribute_type INTEGER NOT NULL
          ) STRICT
        `);
      }
    });
    await this.db.setup(1, 'user_attributes', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE user_attributes (
            user_name TEXT NOT NULL,
            attribute_name TEXT NOT NULL,
            attribute_type INTEGER NOT NULL,
            value_string TEXT,
            value_integer INTEGER,
            value_boolean INTEGER,

            PRIMARY KEY (user_name, attribute_name),

            FOREIGN KEY (user_name)
              REFERENCES users(name)
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
        db.exec(`
          CREATE TRIGGER user_attributes_type_matches_definition_insert
          BEFORE INSERT ON user_attributes
          WHEN NOT EXISTS (
            SELECT 1
            FROM user_attribute_definitions
            WHERE attribute_name = NEW.attribute_name
              AND attribute_type = NEW.attribute_type
          )
          BEGIN
            SELECT RAISE(ABORT, 'User attribute type does not match definition');
          END
        `);
        db.exec(`
          CREATE TRIGGER user_attributes_type_matches_definition_update
          BEFORE UPDATE ON user_attributes
          WHEN NOT EXISTS (
            SELECT 1
            FROM user_attribute_definitions
            WHERE attribute_name = NEW.attribute_name
              AND attribute_type = NEW.attribute_type
          )
          BEGIN
            SELECT RAISE(ABORT, 'User attribute type does not match definition');
          END
        `);
      }
    });
  }

  public async get(_: AbortSignal, userName: string): Promise<UserAttributes> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT attribute_name, attribute_type, value_string, value_integer, value_boolean
        FROM user_attributes
        WHERE user_name = ?
      `);
      const rows = statement.all(userName) as {
        attribute_name: string;
        attribute_type: UserAttributeValueType;
        value_string: string | null;
        value_integer: number | null;
        value_boolean: number | null;
      }[];

      const attributes = Object.fromEntries(
        rows.map(row => {
          switch (row.attribute_type) {
            case UserAttributeValueType.STRING:
              return [row.attribute_name, row.value_string!];
            case UserAttributeValueType.INTEGER:
              return [row.attribute_name, row.value_integer!];
            case UserAttributeValueType.BOOLEAN:
              return [row.attribute_name, row.value_boolean === 1];
            default:
              throw new UserAttributesRepositoryError(`Unsupported user attribute type: ${row.attribute_type}`);
          }
        })
      );
      return new UserAttributes(userName, attributes);
    });
  }

  public async replace(_: AbortSignal, attributes: UserAttributes, transaction?: Transaction): Promise<void> {
    try {
      await this.db.write(db => {
        const deleteAttributesStatement = db.prepare(`
          DELETE FROM user_attributes
          WHERE user_name = ?
        `);
        const insertAttributeStatement = db.prepare(`
          INSERT INTO user_attributes (user_name, attribute_name, attribute_type, value_string, value_integer, value_boolean)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        deleteAttributesStatement.run(attributes.userName);
        for (const [name, value] of Object.entries(attributes.attributes)) {
          const attribute = serializeAttributeValue(value);
          this.ensureDefinition(db, name, attribute.type);
          insertAttributeStatement.run(
            attributes.userName,
            name,
            attribute.type,
            attribute.valueString,
            attribute.valueInteger,
            attribute.valueBoolean
          );
        }
      }, transaction);
    } catch (e) {
      if (e instanceof UserAttributesRepositoryError) {
        throw e;
      }
      throw e;
    }
  }

  private ensureDefinition(db: DatabaseSync, name: string, type: UserAttributeValueType): void {
    const insertDefinitionStatement = db.prepare(`
      INSERT INTO user_attribute_definitions (attribute_name, attribute_type)
      VALUES (?, ?)
      ON CONFLICT(attribute_name) DO NOTHING
    `);
    insertDefinitionStatement.run(name, type);

    const getDefinitionStatement = db.prepare(`
      SELECT attribute_type
      FROM user_attribute_definitions
      WHERE attribute_name = ?
      LIMIT 1
    `);
    const row = getDefinitionStatement.get(name) as { attribute_type: UserAttributeValueType };
    if (row.attribute_type !== type) {
      throw new UserAttributesRepositoryError(`User attribute "${name}" already exists with a different value type`);
    }
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
        throw new UserAttributesRepositoryError('User attribute number value must be an integer');
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
