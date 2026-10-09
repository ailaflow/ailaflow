import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTableResponse,
  GetTableResponse,
  GetTableDataPageRequest,
  GetTableDataPageResponse,
  GetTablesRequest,
  GetTablesResponse,
  SaveTableDataRowRequest,
  SaveTableRequest,
  SaveTableResponse
} from '@ailaflow/shared';

export class TableApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveTable(signal: AbortSignal, request: SaveTableRequest): Promise<SaveTableResponse> {
    return this.client.json(signal, 'POST', '/api/table', request);
  }

  public getTables(signal: AbortSignal, request: GetTablesRequest): Promise<GetTablesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(signal, 'GET', `/api/tables?${query}`);
  }

  public getTable(signal: AbortSignal, name: string): Promise<GetTableResponse> {
    return this.client.json(signal, 'GET', `/api/tables/${name}`);
  }

  public getTableDataPage(signal: AbortSignal, name: string, request: GetTableDataPageRequest): Promise<GetTableDataPageResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize),
      orderBy: request.orderBy,
      ascending: String(request.ascending)
    });
    return this.client.json(signal, 'GET', `/api/tables/${name}/data?${query}`);
  }

  public saveTableDataRow(signal: AbortSignal, name: string, request: SaveTableDataRowRequest): Promise<void> {
    return this.client.json(signal, 'POST', `/api/tables/${name}/data-row`, request);
  }

  public deleteTableDataRow(signal: AbortSignal, name: string, id: string): Promise<void> {
    return this.client.json(signal, 'DELETE', `/api/tables/${name}/data-row/${encodeURIComponent(id)}`);
  }

  public deleteTable(signal: AbortSignal, name: string): Promise<DeleteTableResponse> {
    return this.client.json(signal, 'DELETE', `/api/tables/${name}`);
  }
}
