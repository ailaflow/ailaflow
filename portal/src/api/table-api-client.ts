import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTableResponse,
  GetTableResponse,
  GetTableDataRequest,
  GetTableDataResponse,
  GetTablesRequest,
  GetTablesResponse,
  SaveTableRequest,
  SaveTableResponse
} from '@ailaflow/model';

export class TableApiClient {
  public constructor(private readonly client: HttpClient) {}

  public saveTable(abortSignal: AbortSignal, request: SaveTableRequest): Promise<SaveTableResponse> {
    return this.client.json(abortSignal, 'POST', '/api/table', request);
  }

  public getTables(abortSignal: AbortSignal, request: GetTablesRequest): Promise<GetTablesResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/tables?${query}`);
  }

  public getTable(abortSignal: AbortSignal, name: string): Promise<GetTableResponse> {
    return this.client.json(abortSignal, 'GET', `/api/tables/${encodeURIComponent(name)}`);
  }

  public getTableData(abortSignal: AbortSignal, name: string, request: GetTableDataRequest): Promise<GetTableDataResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/tables/${encodeURIComponent(name)}/data?${query}`);
  }

  public deleteTable(abortSignal: AbortSignal, name: string): Promise<DeleteTableResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/tables/${encodeURIComponent(name)}`);
  }
}
