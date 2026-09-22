import { Transaction } from '../core/transaction';
import { TableSchemaConcurrencyError, TableSchemaRepository } from '../repositories/table/table-schema-repository';
import { TableSchema } from '../repositories/table/table-schema';

export class TableSchemaManager {
  private readonly cache = new Map<string, TableSchema>();

  public constructor(private readonly repository: TableSchemaRepository) {}

  public async get(signal: AbortSignal, tableName: string): Promise<TableSchema> {
    const cached = this.cache.get(tableName);
    if (cached) {
      return cached;
    }

    const schema = await this.repository.get(signal, tableName);
    this.cache.set(tableName, schema);
    return schema;
  }

  public async tryGet(signal: AbortSignal, tableName: string): Promise<TableSchema | null> {
    const cached = this.cache.get(tableName);
    if (cached) {
      return cached;
    }

    const schema = await this.repository.tryGet(signal, tableName);
    if (schema) {
      this.cache.set(tableName, schema);
    }
    return schema;
  }

  public async ensureCompatible(
    signal: AbortSignal,
    tableName: string,
    row: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TableSchema> {
    let schema = await this.get(signal, tableName);

    while (true) {
      signal.throwIfAborted();
      const extended = schema.tryExtend(row);
      if (extended === null) {
        return schema;
      }

      try {
        const saved = await this.repository.save(signal, extended, transaction);
        this.cache.set(tableName, saved);
        return saved;
      } catch (error) {
        if (!(error instanceof TableSchemaConcurrencyError)) {
          throw error;
        }
        schema = await this.repository.get(signal, tableName);
        this.cache.set(tableName, schema);
      }
    }
  }

  public invalidate(tableName: string): void {
    this.cache.delete(tableName);
  }
}
