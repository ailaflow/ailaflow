import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UserAccessComparisonOperator,
  UserAccessExpressionKind,
  UserAccessExpressionParser,
  UserAccessExpressionParserError
} from './user-access-expression-parser';
import { ALL_ATTRIBUTE_NAME, USER_NAME_ATTRIBUTE_NAME, UserAttributeValueType } from '../user/user-attributes';

function createParser(): UserAccessExpressionParser {
  return new UserAccessExpressionParser();
}

function assertParserError(source: string, expectedMessage: RegExp): void {
  assert.throws(
    () => createParser().parse(source),
    error => {
      assert.ok(error instanceof UserAccessExpressionParserError);
      assert.match(error.message, expectedMessage);
      return true;
    }
  );
}

test('empty expression selects all users', () => {
  const expression = createParser().parse('');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: ALL_ATTRIBUTE_NAME,
    attributeType: UserAttributeValueType.BOOLEAN,
    value: true
  });
});

test('whitespace-only expression selects all users', () => {
  const expression = createParser().parse(' \n\t  ');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: ALL_ATTRIBUTE_NAME,
    attributeType: UserAttributeValueType.BOOLEAN,
    value: true
  });
});

test('user reference is converted to the virtual user name attribute', () => {
  const expression = createParser().parse('@alice');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: USER_NAME_ATTRIBUTE_NAME,
    attributeType: UserAttributeValueType.STRING,
    value: 'alice'
  });
});

test('leading and trailing whitespace is ignored', () => {
  const expression = createParser().parse('    @alice   ');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: USER_NAME_ATTRIBUTE_NAME,
    attributeType: UserAttributeValueType.STRING,
    value: 'alice'
  });
});

test('multiple user references joined with OR are parsed', () => {
  const expression = createParser().parse('@alice or @bob');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.OR,
    args: [
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: USER_NAME_ATTRIBUTE_NAME,
        attributeType: UserAttributeValueType.STRING,
        value: 'alice'
      },
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: USER_NAME_ATTRIBUTE_NAME,
        attributeType: UserAttributeValueType.STRING,
        value: 'bob'
      }
    ]
  });
});

test('integer comparison is parsed', () => {
  const expression = createParser().parse('@{   .score == 1 }');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: 'score',
    attributeType: UserAttributeValueType.INTEGER,
    value: 1
  });
});

test('string, integer and boolean comparisons are parsed', () => {
  const expression = createParser().parse('@{.department = "sales" and .age >= 18 and .active = true}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.AND,
    args: [
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: 'department',
        attributeType: UserAttributeValueType.STRING,
        value: 'sales'
      },
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.GTE,
        attributeName: 'age',
        attributeType: UserAttributeValueType.INTEGER,
        value: 18
      },
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: 'active',
        attributeType: UserAttributeValueType.BOOLEAN,
        value: true
      }
    ]
  });
});

test('AND has higher precedence than OR', () => {
  const expression = createParser().parse('@alice or @bob and @{.active = true}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.OR,
    args: [
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: USER_NAME_ATTRIBUTE_NAME,
        attributeType: UserAttributeValueType.STRING,
        value: 'alice'
      },
      {
        kind: UserAccessExpressionKind.AND,
        args: [
          {
            kind: UserAccessExpressionKind.COMPARISON,
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'bob'
          },
          {
            kind: UserAccessExpressionKind.COMPARISON,
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

test('parentheses override operator precedence', () => {
  const expression = createParser().parse('(@alice or @bob) and @{.active = true}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.AND,
    args: [
      {
        kind: UserAccessExpressionKind.OR,
        args: [
          {
            kind: UserAccessExpressionKind.COMPARISON,
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'alice'
          },
          {
            kind: UserAccessExpressionKind.COMPARISON,
            operator: UserAccessComparisonOperator.EQ,
            attributeName: USER_NAME_ATTRIBUTE_NAME,
            attributeType: UserAttributeValueType.STRING,
            value: 'bob'
          }
        ]
      },
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: 'active',
        attributeType: UserAttributeValueType.BOOLEAN,
        value: true
      }
    ]
  });
});

test('NOT expression is parsed', () => {
  const expression = createParser().parse('not @{.active = false}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.NOT,
    arg: {
      kind: UserAccessExpressionKind.COMPARISON,
      operator: UserAccessComparisonOperator.EQ,
      attributeName: 'active',
      attributeType: UserAttributeValueType.BOOLEAN,
      value: false
    }
  });
});

test('excess whitespace inside a selector is ignored', () => {
  const expression = createParser().parse('@{   .department   ==   "sales"   }');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: 'department',
    attributeType: UserAttributeValueType.STRING,
    value: 'sales'
  });
});

test('multiline expressions are parsed', () => {
  const expression = createParser().parse(`
    @{
      .active = true
      and
      .age >= 18
    }
  `);

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.AND,
    args: [
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.EQ,
        attributeName: 'active',
        attributeType: UserAttributeValueType.BOOLEAN,
        value: true
      },
      {
        kind: UserAccessExpressionKind.COMPARISON,
        operator: UserAccessComparisonOperator.GTE,
        attributeName: 'age',
        attributeType: UserAttributeValueType.INTEGER,
        value: 18
      }
    ]
  });
});

test('negative integer comparison is parsed', () => {
  const expression = createParser().parse('@{.temperature < -10}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.LT,
    attributeName: 'temperature',
    attributeType: UserAttributeValueType.INTEGER,
    value: -10
  });
});

test('escaped string value is parsed', () => {
  const expression = createParser().parse('@{.message = "hello\\nworld"}');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: 'message',
    attributeType: UserAttributeValueType.STRING,
    value: 'hello\nworld'
  });
});

test('any valid username is accepted without resolution', () => {
  const expression = createParser().parse('@unknown');

  assert.deepEqual(expression, {
    kind: UserAccessExpressionKind.COMPARISON,
    operator: UserAccessComparisonOperator.EQ,
    attributeName: USER_NAME_ATTRIBUTE_NAME,
    attributeType: UserAttributeValueType.STRING,
    value: 'unknown'
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
