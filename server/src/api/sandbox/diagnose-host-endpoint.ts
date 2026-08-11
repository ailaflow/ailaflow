import { Endpoint } from '../framework/endpoint';
import { SandboxHostDiagnostician, SandboxHostDiagnosticianResult } from '../../sandbox/sandbox-host-diagnostician';

export class DiagnoseHostEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/sandboxes/diagnose-host';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly diagnostician: SandboxHostDiagnostician) {}

  public async handle(): Promise<SandboxHostDiagnosticianResult> {
    return this.diagnostician.diagnose();
  }
}
