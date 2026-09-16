import { LicenseConfigurationApiClient } from './license-configuration-api-client';
import { HttpClient, SseTransport } from '@aibindkit/react';
import { AuthApiClient } from './auth-api-client';
import { InstallApiClient } from './install-api-client';
import { MyProcessApiClient } from './my-process-api-client';
import { MyNotificationApiClient } from './my-notification-api-client';
import { MyTaskApiClient } from './my-task-api-client';
import { ProcessApiClient } from './process-api-client';
import { SandboxApiClient } from './sandbox-api-client';
import { UserApiClient } from './user-api-client';
import { TableApiClient } from './table-api-client';
import { LlmConfigurationApiClient } from './llm-configuration-api-client';
import { TelegramConfigurationApiClient } from './telegram-configuration-api-client';
import { TaskApiClient } from './task-api-client';
import { PublicUrlConfigurationApiClient } from './public-url-configuration-api-client';
import { SlackConfigurationApiClient } from './slack-configuration-api-client';
import { MySlackConfigurationApiClient } from './my-slack-configuration-api-client';

export class ApiClient {
  private readonly client: HttpClient;
  public readonly install: InstallApiClient;
  public readonly licenseConfiguration: LicenseConfigurationApiClient;
  public readonly auth: AuthApiClient;
  public readonly chat: SseTransport;
  public readonly process: ProcessApiClient;
  public readonly sandbox: SandboxApiClient;
  public readonly user: UserApiClient;
  public readonly myProcess: MyProcessApiClient;
  public readonly myNotification: MyNotificationApiClient;
  public readonly myTask: MyTaskApiClient;
  public readonly table: TableApiClient;
  public readonly llmConfiguration: LlmConfigurationApiClient;
  public readonly telegramConfiguration: TelegramConfigurationApiClient;
  public readonly task: TaskApiClient;
  public readonly publicUrlConfiguration: PublicUrlConfigurationApiClient;
  public readonly slackConfiguration: SlackConfigurationApiClient;
  public readonly mySlackConfiguration: MySlackConfigurationApiClient;

  public constructor(authToken: string | null) {
    this.client = new HttpClient(this.createHeaders(authToken));
    this.install = new InstallApiClient(this.client);
    this.licenseConfiguration = new LicenseConfigurationApiClient(this.client);
    this.auth = new AuthApiClient(this.client);
    this.chat = new SseTransport(this.client);
    this.process = new ProcessApiClient(this.client);
    this.sandbox = new SandboxApiClient(this.client);
    this.user = new UserApiClient(this.client);
    this.myProcess = new MyProcessApiClient(this.client);
    this.myNotification = new MyNotificationApiClient(this.client);
    this.myTask = new MyTaskApiClient(this.client);
    this.table = new TableApiClient(this.client);
    this.llmConfiguration = new LlmConfigurationApiClient(this.client);
    this.telegramConfiguration = new TelegramConfigurationApiClient(this.client);
    this.task = new TaskApiClient(this.client);
    this.publicUrlConfiguration = new PublicUrlConfigurationApiClient(this.client);
    this.slackConfiguration = new SlackConfigurationApiClient(this.client);
    this.mySlackConfiguration = new MySlackConfigurationApiClient(this.client);
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
