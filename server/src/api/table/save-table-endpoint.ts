import { saveTableRequestSchema, SaveTableResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { TableRepository, TableRepositoryError } from '../../repositories/table/table-repository';
import { Table } from '../../repositories/table/table';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveTableEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/table';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: TableRepository) {}

  public async handle(req: Request): Promise<SaveTableResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(saveTableRequestSchema, req.body);

    try {
      const existingTable = await this.repository.tryGetByName(abortSignal, request.name);
      if (request.insert) {
        if (existingTable) {
          throw new EndpointError('Table already exists', 400);
        }
        await this.repository.insert(abortSignal, Table.create(request.name, request.description));
      } else {
        if (!existingTable) {
          throw new EndpointError('Table not found', 404);
        }
        existingTable.update(request.description);
        await this.repository.update(abortSignal, existingTable);
      }
    } catch (e) {
      if (e instanceof TableRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return { name: request.name };
  }
}
