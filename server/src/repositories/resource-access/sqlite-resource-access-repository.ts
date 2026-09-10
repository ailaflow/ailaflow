import { DatabaseSync } from 'node:sqlite';
import { UserAccessCondition, UserAttributeValueType } from '@ailaflow/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ResourceAccess, ResourceAccessRepository } from './resource-access-repository';

export class SqliteResourceAccessRepository implements ResourceAccessRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_access_rule_groups (
        resource_id TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        condition_count INTEGER NOT NULL,

        PRIMARY KEY (resource_id, group_id),

        CHECK (condition_count > 0)
      ) STRICT
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_access_rule_conditions (
        resource_id TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        condition_id INTEGER NOT NULL,
        attribute_name TEXT NOT NULL,
        operator INTEGER NOT NULL,
        attribute_type INTEGER NOT NULL,
        value_string TEXT,
        value_integer INTEGER,
        value_boolean INTEGER,

        PRIMARY KEY (resource_id, group_id, condition_id),

        FOREIGN KEY (resource_id, group_id)
          REFERENCES resource_access_rule_groups(resource_id, group_id)
          ON DELETE CASCADE,

        CHECK (operator BETWEEN 1 AND 6),

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
      CREATE INDEX IF NOT EXISTS resource_access_rule_conditions_lookup_idx
      ON resource_access_rule_conditions(attribute_name, attribute_type, operator)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS resource_access_rule_conditions_value_lookup_idx
      ON resource_access_rule_conditions(attribute_name, attribute_type, operator, value_string, value_integer, value_boolean)
    `);
  }

  public async replace(_: AbortSignal, resourceAccess: ResourceAccess): Promise<void> {
    const deleteGroupsStatement = this.db.prepare(`
      DELETE FROM resource_access_rule_groups
      WHERE resource_id = ?
    `);
    const insertGroupStatement = this.db.prepare(`
      INSERT INTO resource_access_rule_groups (resource_id, group_id, condition_count)
      VALUES (?, ?, ?)
    `);
    const insertConditionStatement = this.db.prepare(`
      INSERT INTO resource_access_rule_conditions (
        resource_id,
        group_id,
        condition_id,
        attribute_name,
        operator,
        attribute_type,
        value_string,
        value_integer,
        value_boolean
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      this.db.exec(`BEGIN`);
      deleteGroupsStatement.run(resourceAccess.resourceId);

      resourceAccess.expression.groups.forEach((group, groupId) => {
        insertGroupStatement.run(resourceAccess.resourceId, groupId, group.conditions.length);

        group.conditions.forEach((condition, conditionId) => {
          const value = serializeConditionValue(condition);
          insertConditionStatement.run(
            resourceAccess.resourceId,
            groupId,
            conditionId,
            condition.attributeName,
            condition.operator,
            condition.attributeType,
            value.valueString,
            value.valueInteger,
            value.valueBoolean
          );
        });
      });

      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }
}

function serializeConditionValue(condition: UserAccessCondition): {
  valueString: string | null;
  valueInteger: number | null;
  valueBoolean: number | null;
} {
  switch (condition.attributeType) {
    case UserAttributeValueType.STRING:
      return {
        valueString: String(condition.value),
        valueInteger: null,
        valueBoolean: null
      };
    case UserAttributeValueType.INTEGER:
      return {
        valueString: null,
        valueInteger: Number(condition.value),
        valueBoolean: null
      };
    case UserAttributeValueType.BOOLEAN:
      return {
        valueString: null,
        valueInteger: null,
        valueBoolean: condition.value ? 1 : 0
      };
  }
}
