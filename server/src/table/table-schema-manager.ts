import { Transaction } from '../core/transaction';
import { TableSchemaConcurrencyError, TableSchemaRepository } from '../repositories/table/table-schema-repository';
import { TableSchema } from '../repositories/table/table-schema';

export class TableSchemaManager {
  private readonly cache = new Map<string, TableSchema>();

  public constructor(private readonly repository: TableSchemaRepository) {}

  public async get(abortSignal: AbortSignal, tableName: string): Promise<TableSchema> {
    const cached = this.cache.get(tableName);
    if (cached) {
      return cached;
    }

    const schema = await this.repository.get(abortSignal, tableName);
    this.cache.set(tableName, schema);
    return schema;
  }

  public async tryGet(abortSignal: AbortSignal, tableName: string): Promise<TableSchema | null> {
    const cached = this.cache.get(tableName);
    if (cached) {
      return cached;
    }

    const schema = await this.repository.tryGet(abortSignal, tableName);
    if (schema) {
      this.cache.set(tableName, schema);
    }
    return schema;
  }

  public async ensureCompatible(
    abortSignal: AbortSignal,
    tableName: string,
    row: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TableSchema> {
    let schema = await this.get(abortSignal, tableName);

    while (true) {
      abortSignal.throwIfAborted();
      const extended = schema.tryExtend(row);
      if (extended === null) {
        return schema;
      }

      try {
        const saved = await this.repository.save(abortSignal, extended, transaction);
        this.cache.set(tableName, saved);
        return saved;
      } catch (error) {
        if (!(error instanceof TableSchemaConcurrencyError)) {
          throw error;
        }
        schema = await this.repository.get(abortSignal, tableName);
        this.cache.set(tableName, schema);
      }
    }
  }

  public invalidate(tableName: string): void {
    this.cache.delete(tableName);
  }
}
