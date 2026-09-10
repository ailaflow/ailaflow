import { DatabaseSync } from 'node:sqlite';
import { UserAccessCondition, UserAccessExpression, UserAttributeValueType } from '@ailaflow/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { UserAccessExpressionUserQuerier } from './user-access-expression-user-querier';

const MATCHING_USER_ACCESS_CONDITION = `
          (
            c.operator = 1
            AND ua.value_string IS c.value_string
            AND ua.value_integer IS c.value_integer
            AND ua.value_boolean IS c.value_boolean
          )
          OR
          (
            c.operator = 2
            AND (
              ua.value_string IS NOT c.value_string
              OR ua.value_integer IS NOT c.value_integer
              OR ua.value_boolean IS NOT c.value_boolean
            )
          )
          OR (c.operator = 3 AND ua.value_integer > c.value_integer)
          OR (c.operator = 4 AND ua.value_integer >= c.value_integer)
          OR (c.operator = 5 AND ua.value_integer < c.value_integer)
          OR (c.operator = 6 AND ua.value_integer <= c.value_integer)
`;

export class SqliteUserAccessExpressionUserQuerier implements UserAccessExpressionUserQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async queryUserNames(_: AbortSignal, expression: UserAccessExpression): Promise<string[]> {
    const serializedExpression = serializeExpression(expression);
    if (serializedExpression.groups.length === 0) {
      return [];
    }
    if (serializedExpression.groups.some(group => group.conditionCount === 0)) {
      return this.queryAllUserNames();
    }

    const statement = this.db.prepare(`
      WITH
      expression_groups(group_id, condition_count) AS (
        VALUES ${buildValuesPlaceholders(serializedExpression.groups.length, 2)}
      ),

      expression_conditions(
        group_id,
        condition_id,
        attribute_name,
        operator,
        attribute_type,
        value_string,
        value_integer,
        value_boolean
      ) AS (
        VALUES ${buildValuesPlaceholders(serializedExpression.conditions.length, 8)}
      ),

      matching_expression_conditions AS (
        SELECT
          ua.user_name,
          c.group_id,
          COUNT(*) AS matched_count
        FROM expression_conditions c
        JOIN user_attributes ua
          ON ua.attribute_name = c.attribute_name
         AND ua.attribute_type = c.attribute_type
        WHERE
${MATCHING_USER_ACCESS_CONDITION}
        GROUP BY ua.user_name, c.group_id
      )

      SELECT DISTINCT mc.user_name
      FROM expression_groups g
      JOIN matching_expression_conditions mc
        ON mc.group_id = g.group_id
       AND mc.matched_count = g.condition_count
      ORDER BY mc.user_name
    `);
    const rows = statement.all(...serializedExpression.parameters) as { user_name: string }[];
    return rows.map(row => row.user_name);
  }

  private queryAllUserNames(): string[] {
    const statement = this.db.prepare(`
      SELECT name
      FROM users
      ORDER BY name
    `);
    const rows = statement.all() as { name: string }[];
    return rows.map(row => row.name);
  }
}

function serializeExpression(expression: UserAccessExpression): {
  groups: {
    groupId: number;
    conditionCount: number;
  }[];
  conditions: {
    groupId: number;
    conditionId: number;
    attributeName: string;
    operator: number;
    attributeType: UserAttributeValueType;
    valueString: string | null;
    valueInteger: number | null;
    valueBoolean: number | null;
  }[];
  parameters: (string | number | null)[];
} {
  const groups = expression.groups.map((group, groupId) => ({
    groupId,
    conditionCount: group.conditions.length
  }));
  const conditions = expression.groups.flatMap((group, groupId) =>
    group.conditions.map((condition, conditionId) => ({
      groupId,
      conditionId,
      ...serializeCondition(condition)
    }))
  );
  const parameters = [
    ...groups.flatMap(group => [group.groupId, group.conditionCount]),
    ...conditions.flatMap(condition => [
      condition.groupId,
      condition.conditionId,
      condition.attributeName,
      condition.operator,
      condition.attributeType,
      condition.valueString,
      condition.valueInteger,
      condition.valueBoolean
    ])
  ];

  return {
    groups,
    conditions,
    parameters
  };
}

function serializeCondition(condition: UserAccessCondition): {
  attributeName: string;
  operator: number;
  attributeType: UserAttributeValueType;
  valueString: string | null;
  valueInteger: number | null;
  valueBoolean: number | null;
} {
  switch (condition.attributeType) {
    case UserAttributeValueType.STRING:
      return {
        attributeName: condition.attributeName,
        operator: condition.operator,
        attributeType: condition.attributeType,
        valueString: String(condition.value),
        valueInteger: null,
        valueBoolean: null
      };
    case UserAttributeValueType.INTEGER:
      return {
        attributeName: condition.attributeName,
        operator: condition.operator,
        attributeType: condition.attributeType,
        valueString: null,
        valueInteger: Number(condition.value),
        valueBoolean: null
      };
    case UserAttributeValueType.BOOLEAN:
      return {
        attributeName: condition.attributeName,
        operator: condition.operator,
        attributeType: condition.attributeType,
        valueString: null,
        valueInteger: null,
        valueBoolean: condition.value ? 1 : 0
      };
  }
}

function buildValuesPlaceholders(rowCount: number, columnCount: number): string {
  return new Array(rowCount)
    .fill(null)
    .map(() => `(${new Array(columnCount).fill('?').join(', ')})`)
    .join(', ');
}
