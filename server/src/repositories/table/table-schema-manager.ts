import { TableSchemaConcurrencyError, TableSchemaRepository } from './table-schema-repository';
import { TableSchema } from './table-schema';

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

  public async ensureCompatible(abortSignal: AbortSignal, tableName: string, row: Record<string, unknown>): Promise<TableSchema> {
    let schema = await this.get(abortSignal, tableName);

    while (true) {
      abortSignal.throwIfAborted();
      const extended = schema.tryExtend(row);
      if (extended === null) {
        return schema;
      }

      try {
        const saved = await this.repository.save(abortSignal, extended);
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
