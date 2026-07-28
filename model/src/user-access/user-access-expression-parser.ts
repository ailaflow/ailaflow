import { ALL_ATTRIBUTE_NAME, USER_NAME_ATTRIBUTE_NAME, UserAttributeValueType } from '../user/user-attributes';

export enum UserAccessComparisonOperator {
  EQ = 1,
  NEQ = 2,
  GT = 3,
  GTE = 4,
  LT = 5,
  LTE = 6
}

export interface UserAccessCondition {
  operator: UserAccessComparisonOperator;
  attributeName: string;
  attributeType: UserAttributeValueType;
  value: string | number | boolean;
}

export interface UserAccessGroup {
  conditions: UserAccessCondition[];
}

export interface UserAccessExpression {
  groups: UserAccessGroup[];
}

interface ParsedLiteral {
  attributeType: UserAttributeValueType;
  value: string | number | boolean;
}

export class UserAccessExpressionParserError extends Error {
  public constructor(
    message: string,
    public readonly source: string,
    public readonly position: number
  ) {
    super(`${message} at position ${position}\n${source}\n${' '.repeat(position)}^`);
    this.name = UserAccessExpressionParserError.name;
  }
}

export class UserAccessExpressionParser {
  public static parse(expression: string): UserAccessExpression {
    if (expression.trim().length === 0) {
      return {
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
      };
    }
    return new ParserSession(expression).parse();
  }

  public static validate(expression: string): string | null {
    try {
      UserAccessExpressionParser.parse(expression);
    } catch (e) {
      if (e instanceof UserAccessExpressionParserError) {
        return e.message;
      }
      throw e;
    }
    return null;
  }
}

class ParserSession {
  private position = 0;

  public constructor(private readonly source: string) {}

  public parse(): UserAccessExpression {
    const groups: UserAccessGroup[] = [this.parseGroup()];

    while (this.consumeKeyword('or')) {
      groups.push(this.parseGroup());
    }

    this.skipWhitespace();

    if (!this.isAtEnd()) {
      this.fail('Unexpected token after expression');
    }

    return { groups };
  }

  private parseGroup(): UserAccessGroup {
    const conditions: UserAccessCondition[] = this.parseTerm();

    while (this.consumeKeyword('and')) {
      conditions.push(...this.parseTerm());
    }

    return { conditions };
  }

  private parseTerm(): UserAccessCondition[] {
    this.skipWhitespace();

    if (this.consumeKeyword('not')) {
      this.failAt('NOT is not supported in access expressions', this.position - 'not'.length);
    }

    if (this.peek() === '(' || this.peek() === ')') {
      this.fail('Parentheses are not supported in access expressions');
    }

    if (this.consumeRaw('@{')) {
      return this.parseSelector();
    }

    if (this.source.startsWith('@{', this.position)) {
      this.fail('Nested selectors are not allowed');
    }

    if (this.peek() === '@') {
      return [this.parseUserName()];
    }

    if (this.peek() === '.') {
      this.fail('Attribute comparisons must be placed inside "@{...}"');
    }

    this.fail('Expected a user reference or selector');
  }

  private parseSelector(): UserAccessCondition[] {
    const conditions: UserAccessCondition[] = [this.parseComparison()];

    while (this.consumeKeyword('and')) {
      conditions.push(this.parseComparison());
    }

    this.skipWhitespace();

    const orPosition = this.position;
    if (this.consumeKeyword('or')) {
      this.failAt('OR is not allowed inside selectors; split alternatives into root groups', orPosition);
    }

    this.expectCharacter('}', 'Expected "}" after selector');

    return conditions;
  }

  private parseUserName(): UserAccessCondition {
    this.position++;

    const username = this.readName('Username');

    return {
      operator: UserAccessComparisonOperator.EQ,
      attributeName: USER_NAME_ATTRIBUTE_NAME,
      attributeType: UserAttributeValueType.STRING,
      value: username
    };
  }

  private parseComparison(): UserAccessCondition {
    this.skipWhitespace();

    if (this.source.startsWith('@{', this.position)) {
      this.fail('Nested selectors are not allowed');
    }

    if (this.peek() === '@') {
      this.fail('User references are not allowed inside selectors');
    }

    if (this.peek() !== '.') {
      this.fail('Expected an attribute comparison');
    }

    this.position++;

    const attributeName = this.readName('Attribute name');

    this.skipWhitespace();

    const operatorPosition = this.position;
    const operator = this.readComparisonOperator();
    const literal = this.readLiteral();

    if (literal.attributeType !== UserAttributeValueType.INTEGER && !this.isEqualityOperator(operator)) {
      this.failAt('String and boolean attributes support only "=" and "!="', operatorPosition);
    }

    return {
      operator,
      attributeName,
      attributeType: literal.attributeType,
      value: literal.value
    };
  }

  private readComparisonOperator(): UserAccessComparisonOperator {
    this.skipWhitespace();

    if (this.consumeRaw('==')) {
      return UserAccessComparisonOperator.EQ;
    }

    if (this.consumeRaw('!=')) {
      return UserAccessComparisonOperator.NEQ;
    }

    if (this.consumeRaw('>=')) {
      return UserAccessComparisonOperator.GTE;
    }

    if (this.consumeRaw('<=')) {
      return UserAccessComparisonOperator.LTE;
    }

    if (this.consumeRaw('=')) {
      return UserAccessComparisonOperator.EQ;
    }

    if (this.consumeRaw('>')) {
      return UserAccessComparisonOperator.GT;
    }

    if (this.consumeRaw('<')) {
      return UserAccessComparisonOperator.LT;
    }

    this.fail('Expected a comparison operator');
  }

  private readLiteral(): ParsedLiteral {
    this.skipWhitespace();

    const character = this.peek();

    if (character === '"' || character === "'") {
      return {
        attributeType: UserAttributeValueType.STRING,
        value: this.readString()
      };
    }

    if (this.consumeKeyword('true')) {
      return {
        attributeType: UserAttributeValueType.BOOLEAN,
        value: true
      };
    }

    if (this.consumeKeyword('false')) {
      return {
        attributeType: UserAttributeValueType.BOOLEAN,
        value: false
      };
    }

    if (this.isDigit(character) || (character === '-' && this.isDigit(this.peek(1)))) {
      return {
        attributeType: UserAttributeValueType.INTEGER,
        value: this.readInteger()
      };
    }

    this.fail('Expected a quoted string, integer, or boolean value');
  }

  private readName(label: string): string {
    const position = this.position;

    while (!this.isAtEnd() && !this.isNameDelimiter(this.peek())) {
      this.position++;
    }

    const name = this.source.slice(position, this.position);

    if (name.length < 3 || name.length > 20) {
      this.failAt(`${label} must be between 3 and 20 characters long`, position);
    }

    if (!/^[a-z][a-z0-9_]+$/.test(name)) {
      this.failAt(`${label} contains invalid characters`, position);
    }

    return name;
  }

  private readString(): string {
    const position = this.position;
    const quote = this.peek();

    this.position++;

    let value = '';

    while (!this.isAtEnd()) {
      const character = this.peek();

      if (character === quote) {
        this.position++;
        return value;
      }

      if (character === '\\') {
        this.position++;

        const escaped = this.peek();

        if (escaped.length === 0) {
          this.fail('Unterminated escape sequence');
        }

        this.position++;

        switch (escaped) {
          case '"':
            value += '"';
            break;

          case "'":
            value += "'";
            break;

          case '\\':
            value += '\\';
            break;

          case 'n':
            value += '\n';
            break;

          case 'r':
            value += '\r';
            break;

          case 't':
            value += '\t';
            break;

          default:
            this.failAt(`Unsupported escape sequence "\\${escaped}"`, this.position - 2);
        }

        continue;
      }

      value += character;
      this.position++;
    }

    this.failAt('Unterminated string', position);
  }

  private readInteger(): number {
    const position = this.position;

    if (this.peek() === '-') {
      this.position++;
    }

    const digitsPosition = this.position;

    while (this.isDigit(this.peek())) {
      this.position++;
    }

    if (digitsPosition === this.position) {
      this.failAt('Expected integer', position);
    }

    if (this.peek() === '.' || this.peek() === 'e' || this.peek() === 'E') {
      this.fail('Floating-point numbers are not supported');
    }

    const rawValue = this.source.slice(position, this.position);
    const value = Number(rawValue);

    if (!Number.isSafeInteger(value)) {
      this.failAt(`Integer "${rawValue}" is outside the safe JavaScript integer range`, position);
    }

    return value;
  }

  private consumeKeyword(keyword: string): boolean {
    this.skipWhitespace();

    if (!this.source.startsWith(keyword, this.position)) {
      return false;
    }

    if (this.isNameCharacter(this.peek(keyword.length))) {
      return false;
    }

    this.position += keyword.length;

    return true;
  }

  private consumeCharacter(character: string): boolean {
    this.skipWhitespace();

    if (this.peek() !== character) {
      return false;
    }

    this.position++;

    return true;
  }

  private expectCharacter(character: string, message: string): void {
    if (!this.consumeCharacter(character)) {
      this.fail(message);
    }
  }

  private consumeRaw(value: string): boolean {
    if (!this.source.startsWith(value, this.position)) {
      return false;
    }

    this.position += value.length;

    return true;
  }

  private skipWhitespace(): void {
    while (/\s/u.test(this.peek())) {
      this.position++;
    }
  }

  private isNameDelimiter(character: string): boolean {
    return (
      character.length === 0 ||
      /\s/u.test(character) ||
      character === '@' ||
      character === '(' ||
      character === ')' ||
      character === '{' ||
      character === '}' ||
      character === '=' ||
      character === '!' ||
      character === '>' ||
      character === '<' ||
      character === '"' ||
      character === "'"
    );
  }

  private isNameCharacter(character: string): boolean {
    return (character >= 'a' && character <= 'z') || (character >= '0' && character <= '9') || character === '_';
  }

  private isDigit(character: string): boolean {
    return character >= '0' && character <= '9';
  }

  private peek(offset = 0): string {
    return this.source[this.position + offset] ?? '';
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private isEqualityOperator(operator: UserAccessComparisonOperator): boolean {
    return operator === UserAccessComparisonOperator.EQ || operator === UserAccessComparisonOperator.NEQ;
  }

  private fail(message: string): never {
    return this.failAt(message, this.position);
  }

  private failAt(message: string, position: number): never {
    throw new UserAccessExpressionParserError(message, this.source, position);
  }
}
