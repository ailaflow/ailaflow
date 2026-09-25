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

  public async tryRead(signal: AbortSignal, tableName: string, _id: string): Promise<TableRow | null> {
    const schema = await this.tableSchemaManager.tryGet(signal, tableName);
    if (!schema) {
      return null;
    }
    return this.tableDataRepository.tryGet(signal, schema, _id);
  }

  public async tryGetByName(signal: AbortSignal, tableName: string): Promise<Table | null> {
    return this.tableRepository.tryGetByName(signal, tableName);
  }

  public async insert(signal: AbortSignal, table: Table): Promise<void> {
    await this.tableRepository.insert(signal, table);
    this.tableSchemaManager.invalidate(table.name);
  }

  public async update(signal: AbortSignal, table: Table): Promise<void> {
    await this.tableRepository.update(signal, table);
  }

  public async delete(signal: AbortSignal, tableName: string): Promise<boolean> {
    const deleted = await this.tableRepository.delete(signal, tableName);
    if (deleted) {
      this.tableSchemaManager.invalidate(tableName);
    }
    return deleted;
  }

  public async readPage(signal: AbortSignal, query: TableDataListQuery): Promise<GetTableDataResponse> {
    const schema = await this.tableSchemaManager.tryGet(signal, query.tableName);
    if (!schema) {
      return {
        rows: [],
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false
      };
    }
    return this.tableDataListQuerier.query(signal, schema, query);
  }

  public async writeRow(signal: AbortSignal, tableName: string, row: Record<string, unknown> & { _id: string }): Promise<void> {
    const validationError = TableRowValidator.validate(row);
    if (validationError) {
      throw new TableSchemaError(validationError);
    }

    await this.ensureTableExists(signal, tableName);
    const schema = await this.tableSchemaManager.ensureCompatible(signal, tableName, row);
    await this.tableDataRepository.upsert(signal, schema, row);
  }

  public async deleteRow(signal: AbortSignal, tableName: string, _id: string): Promise<boolean> {
    const schema = await this.tableSchemaManager.tryGet(signal, tableName);
    if (!schema) {
      return false;
    }

    return this.tableDataRepository.delete(signal, tableName, _id);
  }

  private async ensureTableExists(signal: AbortSignal, tableName: string): Promise<void> {
    if (await this.tryGetByName(signal, tableName)) {
      return;
    }

    try {
      await this.insert(signal, Table.create(tableName, ''));
    } catch (error) {
      if (await this.tryGetByName(signal, tableName)) {
        return;
      }
      throw error;
    }
  }
}
