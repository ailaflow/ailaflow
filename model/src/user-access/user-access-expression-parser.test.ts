import assert from 'node:assert/strict';
import test from 'node:test';
import { UserAccessComparisonOperator, UserAccessExpressionParser, UserAccessExpressionParserError } from './user-access-expression-parser';
import { ALL_ATTRIBUTE_NAME, USER_NAME_ATTRIBUTE_NAME, UserAttributeValueType } from '../user/user-attributes';

function assertParserError(source: string, expectedMessage: RegExp): void {
  assert.throws(
    () => UserAccessExpressionParser.parse(source),
    error => {
      assert.ok(error instanceof UserAccessExpressionParserError);
      assert.match(error.message, expectedMessage);
      return true;
    }
  );
}

test('empty expression selects all users', () => {
  const expression = UserAccessExpressionParser.parse('');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: ALL_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.BOOLEAN,
            value: true
          }
        ]
      }
    ]
  });
});

test('whitespace-only expression selects all users', () => {
  const expression = UserAccessExpressionParser.parse(' \n\t  ');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: ALL_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.BOOLEAN,
            value: true
          }
        ]
      }
    ]
  });
});

test('user reference is converted to the virtual user name attribute', () => {
  const expression = UserAccessExpressionParser.parse('@alice');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          }
        ]
      }
    ]
  });
});

test('leading and trailing whitespace is ignored', () => {
  const expression = UserAccessExpressionParser.parse('    @alice   ');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          }
        ]
      }
    ]
  });
});

test('multiple user references joined with OR are parsed as separate groups', () => {
  const expression = UserAccessExpressionParser.parse('@alice or @bob');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          }
        ]
      },
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'bob'
          }
        ]
      }
    ]
  });
});

test('integer comparison is parsed', () => {
  const expression = UserAccessExpressionParser.parse('@{   .score == 1 }');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'score',
            attributeType: UserAttributeValueType.INTEGER,
            value: 1
          }
        ]
      }
    ]
  });
});

test('string, integer and boolean comparisons are parsed into one AND group', () => {
  const expression = UserAccessExpressionParser.parse('@{.department = "sales" and .age >= 18 and .active = true}');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'department',
            attributeType: UserAttributeValueType.STRING,
            value: 'sales'
          },
          {
            operator: UserAccessComparisonOperator.GTE,
            attributeName: 'age',
            attributeType: UserAttributeValueType.INTEGER,
            value: 18
          },
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'active',
            attributeType: UserAttributeValueType.BOOLEAN,
            value: true
          }
        ]
      }
    ]
  });
});

test('root OR separates AND groups', () => {
  const expression = UserAccessExpressionParser.parse('@alice or @bob and @{.active = true}');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          }
        ]
      },
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'bob'
          },
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'active',
            attributeType: UserAttributeValueType.BOOLEAN,
            value: true
          }
        ]
      }
    ]
  });
});

test('selectors are flattened into the current group', () => {
  const expression = UserAccessExpressionParser.parse('@alice and @{.active = true and .age >= 18}');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          },
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
  });
});

test('excess whitespace inside a selector is ignored', () => {
  const expression = UserAccessExpressionParser.parse('@{   .department   ==   "sales"   }');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'department',
            attributeType: UserAttributeValueType.STRING,
            value: 'sales'
          }
        ]
      }
    ]
  });
});

test('multiline expressions are parsed', () => {
  const expression = UserAccessExpressionParser.parse(`
    @{
      .active = true
      and
      .age >= 18
    }
  `);

  assert.deepEqual(expression, {
    groups: [
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
  });
});

test('negative integer comparison is parsed', () => {
  const expression = UserAccessExpressionParser.parse('@{.temperature < -10}');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.LT,
            attributeName: 'temperature',
            attributeType: UserAttributeValueType.INTEGER,
            value: -10
          }
        ]
      }
    ]
  });
});

test('escaped string value is parsed', () => {
  const expression = UserAccessExpressionParser.parse('@{.message = "hello\\nworld"}');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: 'message',
            attributeType: UserAttributeValueType.STRING,
            value: 'hello\nworld'
          }
        ]
      }
    ]
  });
});

test('any valid username is accepted without resolution', () => {
  const expression = UserAccessExpressionParser.parse('@unknown');

  assert.deepEqual(expression, {
    groups: [
      {
        conditions: [
          {
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'unknown'
          }
        ]
      }
    ]
  });
});

test('floating-point values are rejected', () => {
  assertParserError('@{.score >= 1.5}', /Floating-point numbers are not supported/);
});

test('ordering operators are rejected for string values', () => {
  assertParserError('@{.department > "sales"}', /String and boolean attributes support only "=" and "!="/);
});

test('ordering operators are rejected for boolean values', () => {
  assertParserError('@{.active >= true}', /String and boolean attributes support only "=" and "!="/);
});

test('NOT expression is rejected', () => {
  assertParserError('not @{.active = false}', /NOT is not supported/);
});

test('parentheses are rejected', () => {
  assertParserError('(@alice or @bob) and @{.active = true}', /Parentheses are not supported/);
});

test('OR inside a selector is rejected', () => {
  assertParserError('@{.department = "sales" or .department = "support"}', /OR is not allowed inside selectors/);
});

test('attribute comparison outside a selector is rejected', () => {
  assertParserError('.active = true', /Attribute comparisons must be placed inside "@\{\.\.\.\}"/);
});

test('user reference inside a selector is rejected', () => {
  assertParserError('@{.active = true and @alice}', /User references are not allowed inside selectors/);
});

test('nested selector is rejected', () => {
  assertParserError('@{.active = true and @{.age >= 18}}', /Nested selectors are not allowed/);
});

test('invalid username is rejected', () => {
  assertParserError('@Alice', /Username contains invalid characters/);
});

test('username shorter than three characters is rejected', () => {
  assertParserError('@ab', /Username must be between 3 and 20 characters long/);
});

test('invalid attribute name is rejected', () => {
  assertParserError('@{.is-active = true}', /Attribute name contains invalid characters/);
});

test('attribute name shorter than three characters is rejected', () => {
  assertParserError('@{.id = 1}', /Attribute name must be between 3 and 20 characters long/);
});

test('unterminated selector is rejected', () => {
  assertParserError('@{.active = true', /Expected "}" after selector/);
});

test('unterminated string is rejected', () => {
  assertParserError('@{.department = "sales}', /Unterminated string/);
});

test('unexpected trailing input is rejected', () => {
  assertParserError('@alice @bob', /Unexpected token after expression/);
});
