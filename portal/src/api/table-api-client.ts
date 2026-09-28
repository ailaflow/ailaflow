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

  public getTableData(signal: AbortSignal, name: string, request: GetTableDataRequest): Promise<GetTableDataResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize),
      orderBy: request.orderBy,
      ascending: String(request.ascending)
    });
    return this.client.json(signal, 'GET', `/api/tables/${name}/data?${query}`);
  }

  public deleteTable(signal: AbortSignal, name: string): Promise<DeleteTableResponse> {
    return this.client.json(signal, 'DELETE', `/api/tables/${name}`);
  }
}
