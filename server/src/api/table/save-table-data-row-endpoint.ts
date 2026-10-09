import { saveTableDataRowRequestSchema, TableSchemaError } from '@ailaflow/shared';
import { Request } from 'express';
import { TableManager } from '../../table/table-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveTableDataRowEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/tables/:name/data-row';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly tableManager: Pick<TableManager, 'writeRow'>) {}

  public async handle(req: Request) {
    const signal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const request = parseBody(saveTableDataRowRequestSchema, req.body);

    try {
      await this.tableManager.writeRow(signal, tableName, request.row);
    } catch (error) {
      if (error instanceof TableSchemaError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
    return {};
  }
}
