import { HttpClient, SseTransport } from '@aibindkit/react';
import { AuthApiClient } from './auth-api-client';
import { InstallApiClient } from './install-api-client';
import { MyProcessApiClient } from './my-process-api-client';
import { MyTaskApiClient } from './my-task-api-client';
import { ProcessApiClient } from './process-api-client';
import { SandboxApiClient } from './sandbox-api-client';
import { UserApiClient } from './user-api-client';

export class ApiClient {
  private readonly client: HttpClient;
  public readonly install: InstallApiClient;
  public readonly auth: AuthApiClient;
  public readonly chat: SseTransport;
  public readonly process: ProcessApiClient;
  public readonly sandbox: SandboxApiClient;
  public readonly user: UserApiClient;
  public readonly myProcess: MyProcessApiClient;
  public readonly myTask: MyTaskApiClient;

  public constructor(authToken: string | null) {
    this.client = new HttpClient(this.createHeaders(authToken));
    this.install = new InstallApiClient(this.client);
    this.auth = new AuthApiClient(this.client);
    this.chat = new SseTransport(this.client);
    this.process = new ProcessApiClient(this.client);
    this.sandbox = new SandboxApiClient(this.client);
    this.user = new UserApiClient(this.client);
    this.myProcess = new MyProcessApiClient(this.client);
    this.myTask = new MyTaskApiClient(this.client);
  }

  public get onUnauthorized() {
    return this.client.onUnauthorized;
  }

  public updateAuthToken(authToken: string) {
    this.client.updateHeaders(this.createHeaders(authToken));
  }

  private createHeaders(authToken: string | null): Record<string, string> {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }
}
