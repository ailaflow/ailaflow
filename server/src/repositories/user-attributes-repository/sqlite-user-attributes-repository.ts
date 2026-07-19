import { DatabaseSync } from 'node:sqlite';
import { UserAttributeValueType } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserAttributesRepository, UserAttributesRepositoryError } from './user-attributes-repository';
import { UserAttributes } from './user-attributes';

export class SqliteUserAttributesRepository implements UserAttributesRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_abortSignal: AbortSignal) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_attribute_definitions (
        attribute_name TEXT PRIMARY KEY,
        attribute_type INTEGER NOT NULL
      ) STRICT
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_attributes (
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
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS user_attributes_type_matches_definition_insert
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
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS user_attributes_type_matches_definition_update
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

  public async get(userName: string): Promise<UserAttributes> {
    const statement = this.db.prepare(`
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
  }

  public async replace(attributes: UserAttributes): Promise<void> {
    const deleteAttributesStatement = this.db.prepare(`
      DELETE FROM user_attributes
      WHERE user_name = ?
    `);
    const insertAttributeStatement = this.db.prepare(`
      INSERT INTO user_attributes (user_name, attribute_name, attribute_type, value_string, value_integer, value_boolean)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      this.db.exec(`BEGIN`);
      deleteAttributesStatement.run(attributes.userName);
      for (const [name, value] of Object.entries(attributes.attributes)) {
        const attribute = serializeAttributeValue(value);
        this.ensureDefinition(name, attribute.type);
        insertAttributeStatement.run(
          attributes.userName,
          name,
          attribute.type,
          attribute.valueString,
          attribute.valueInteger,
          attribute.valueBoolean
        );
      }
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      if (e instanceof UserAttributesRepositoryError) {
        throw e;
      }
      throw e;
    }
  }

  private ensureDefinition(name: string, type: UserAttributeValueType): void {
    const insertDefinitionStatement = this.db.prepare(`
      INSERT INTO user_attribute_definitions (attribute_name, attribute_type)
      VALUES (?, ?)
      ON CONFLICT(attribute_name) DO NOTHING
    `);
    insertDefinitionStatement.run(name, type);

    const getDefinitionStatement = this.db.prepare(`
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
