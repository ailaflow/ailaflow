import { HttpClient } from '@aibindkit/react';
import type {
  DeleteTableResponse,
  GetTableResponse,
  GetTablesRequest,
  GetTablesResponse,
  SaveTableRequest,
  SaveTableResponse
} from '@aila/model';

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

  public deleteTable(abortSignal: AbortSignal, name: string): Promise<DeleteTableResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/tables/${encodeURIComponent(name)}`);
  }
}
