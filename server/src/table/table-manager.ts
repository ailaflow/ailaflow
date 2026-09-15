import { GetTableDataResponse, TableRow, TableRowValidator, TableSchemaError } from '@ailaflow/shared';
import { TableDataListQuerier, TableDataListQuery } from '../queriers/table-data-list/table-data-list-querier';
import { TableDataRepository } from '../repositories/table/table-data-repository';
import { TableRepository } from '../repositories/table/table-repository';
import { Table } from '../repositories/table/table';
import { TableSchemaManager } from './table-schema-manager';

export class TableManager {
  public constructor(
    private readonly tableRepository: TableRepository,
    private readonly tableDataRepository: TableDataRepository,
    private readonly tableSchemaManager: TableSchemaManager,
    private readonly tableDataListQuerier: TableDataListQuerier
  ) {}

  public async tryRead(abortSignal: AbortSignal, tableName: string, _id: string): Promise<TableRow | null> {
    const schema = await this.tableSchemaManager.tryGet(abortSignal, tableName);
    if (!schema) {
      return null;
    }
    return this.tableDataRepository.tryGet(abortSignal, schema, _id);
  }

  public async tryGetByName(abortSignal: AbortSignal, tableName: string): Promise<Table | null> {
    return this.tableRepository.tryGetByName(abortSignal, tableName);
  }

  public async insert(abortSignal: AbortSignal, table: Table): Promise<void> {
    await this.tableRepository.insert(abortSignal, table);
    this.tableSchemaManager.invalidate(table.name);
  }

  public async update(abortSignal: AbortSignal, table: Table): Promise<void> {
    await this.tableRepository.update(abortSignal, table);
  }

  public async delete(abortSignal: AbortSignal, tableName: string): Promise<boolean> {
    const deleted = await this.tableRepository.delete(abortSignal, tableName);
    if (deleted) {
      this.tableSchemaManager.invalidate(tableName);
    }
    return deleted;
  }

  public async readPage(abortSignal: AbortSignal, query: TableDataListQuery): Promise<GetTableDataResponse> {
    const schema = await this.tableSchemaManager.tryGet(abortSignal, query.tableName);
    if (!schema) {
      return {
        rows: [],
        totalCount: 0,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false
      };
    }
    return this.tableDataListQuerier.query(abortSignal, schema, query);
  }

  public async write(abortSignal: AbortSignal, tableName: string, row: Record<string, unknown> & { _id: string }): Promise<void> {
    const validationError = TableRowValidator.validate(row);
    if (validationError) {
      throw new TableSchemaError(validationError);
    }

    await this.ensureTableExists(abortSignal, tableName);
    const schema = await this.tableSchemaManager.ensureCompatible(abortSignal, tableName, row);
    await this.tableDataRepository.upsert(abortSignal, schema, row);
  }

  private async ensureTableExists(abortSignal: AbortSignal, tableName: string): Promise<void> {
    if (await this.tryGetByName(abortSignal, tableName)) {
      return;
    }

    try {
      await this.insert(abortSignal, Table.create(tableName, ''));
    } catch (error) {
      if (await this.tryGetByName(abortSignal, tableName)) {
        return;
      }
      throw error;
    }
  }
}
