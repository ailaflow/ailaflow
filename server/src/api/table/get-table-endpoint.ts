import { GetTableResponse } from '@aila/model';
import { Request } from 'express';
import { TableRepository } from '../../repositories/table/table-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetTableEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/tables/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: TableRepository) {}

  public async handle(req: Request): Promise<GetTableResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const table = await this.repository.tryGetByName(abortSignal, tableName);
    if (!table) {
      throw new EndpointError('Table not found', 404);
    }

    return {
      table: {
        name: table.name,
        description: table.description
      }
    };
  }
}
