import type { DiagnoseHostResponse } from '@ailaflow/shared';
import { Endpoint } from '../framework/endpoint';
import { SandboxHostDiagnostician } from '../../sandbox/sandbox-host-diagnostician';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { Request } from 'express';

export class DiagnoseHostEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes/diagnose-host';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly diagnostician: SandboxHostDiagnostician) {}

  public async handle(req: Request): Promise<DiagnoseHostResponse> {
    const signal = getEndpointAbortSignal(req);
    return this.diagnostician.diagnose(signal);
  }
}
