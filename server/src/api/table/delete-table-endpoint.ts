import { DeleteTableResponse } from '@aila/model';
import { Request } from 'express';
import { TableRepository } from '../../repositories/table/table-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteTableEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/tables/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: TableRepository) {}

  public async handle(req: Request): Promise<DeleteTableResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const tableName = String(req.params.name);
    const deleted = await this.repository.delete(abortSignal, tableName);
    if (!deleted) {
      throw new EndpointError('Table not found', 404);
    }

    return { name: tableName };
  }
}
