import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { UserAccessComparisonOperator, UserAttributeValueType } from '@ailaflow/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ResourceAccess } from './resource-access-repository';
import { SqliteResourceAccessRepository } from './sqlite-resource-access-repository';

test('resource access rules are replaced as grouped conditions', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteResourceAccessRepository(dbs);

  await repository.setup(abortSignal);

  await repository.replace(
    abortSignal,
    new ResourceAccess('process:review', {
      groups: [
        {
          conditions: [
            {
              operator: UserAccessComparisonOperator.EQ,
              attributeName: '$user_name',
              attributeType: UserAttributeValueType.STRING,
              value: 'alice'
            }
          ]
        },
        {
          conditions: [
            {
              operator: UserAccessComparisonOperator.EQ,
              attributeName: 'active',
              attributeType: UserAttributeValueType.BOOLEAN,
              value: true
            },
            {
              operator: UserAccessComparisonOperator.GTE,
              attributeName: 'age',
              attributeType: UserAttributeValueType.INTEGER,
              value: 18
            }
          ]
        }
      ]
    })
  );

  assert.deepEqual(
    toPlainRows(
      db.prepare(
        `
          SELECT resource_id, group_id, condition_count
          FROM resource_access_rule_groups
          ORDER BY group_id
        `
      )
    ),
    [
      { resource_id: 'process:review', group_id: 0, condition_count: 1 },
      { resource_id: 'process:review', group_id: 1, condition_count: 2 }
    ]
  );
  assert.deepEqual(
    toPlainRows(
      db.prepare(
        `
          SELECT
            group_id,
            condition_id,
            attribute_name,
            operator,
            attribute_type,
            value_string,
            value_integer,
            value_boolean
          FROM resource_access_rule_conditions
          ORDER BY group_id, condition_id
        `
      )
    ),
    [
      {
        group_id: 0,
        condition_id: 0,
        attribute_name: '$user_name',
        operator: UserAccessComparisonOperator.EQ,
        attribute_type: UserAttributeValueType.STRING,
        value_string: 'alice',
        value_integer: null,
        value_boolean: null
      },
      {
        group_id: 1,
        condition_id: 0,
        attribute_name: 'active',
        operator: UserAccessComparisonOperator.EQ,
        attribute_type: UserAttributeValueType.BOOLEAN,
        value_string: null,
        value_integer: null,
        value_boolean: 1
      },
      {
        group_id: 1,
        condition_id: 1,
        attribute_name: 'age',
        operator: UserAccessComparisonOperator.GTE,
        attribute_type: UserAttributeValueType.INTEGER,
        value_string: null,
        value_integer: 18,
        value_boolean: null
      }
    ]
  );

  await repository.replace(
    abortSignal,
    new ResourceAccess('process:review', {
      groups: [
        {
          conditions: [
            {
              operator: UserAccessComparisonOperator.EQ,
              attributeName: '$user_name',
              attributeType: UserAttributeValueType.STRING,
              value: 'bob'
            }
          ]
        }
      ]
    })
  );

  assert.deepEqual(
    toPlainRows(
      db.prepare(
        `
          SELECT group_id, condition_count
          FROM resource_access_rule_groups
        `
      )
    ),
    [{ group_id: 0, condition_count: 1 }]
  );
  assert.deepEqual(
    toPlainRows(
      db.prepare(
        `
          SELECT attribute_name, value_string
          FROM resource_access_rule_conditions
        `
      )
    ),
    [{ attribute_name: '$user_name', value_string: 'bob' }]
  );

  const indexes = toPlainRows(
    db.prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name IN (
            'resource_access_rule_conditions_lookup_idx',
            'resource_access_rule_conditions_value_lookup_idx'
          )
        ORDER BY name
      `
    )
  );
  assert.deepEqual(indexes, [
    { name: 'resource_access_rule_conditions_lookup_idx' },
    { name: 'resource_access_rule_conditions_value_lookup_idx' }
  ]);

  db.close();
});

function toPlainRows(statement: ReturnType<DatabaseSync['prepare']>): Record<string, unknown>[] {
  return statement.all().map(row => ({ ...row }));
}
