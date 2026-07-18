import { HttpClient, HttpClientSseListener, SseTransport } from '@aibindkit/react';
import type {
  GetSandboxResponse,
  GetSandboxesResponse,
  GetUserResponse,
  GetProcessesResponse,
  GetProcessResponse,
  InstallRequest,
  InstallResponse,
  GetUsersResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TestProcessRequest,
  TestProcessUpdate,
  UpdateUserRequest,
  UpdateUserResponse,
  UpdateProcessRequest,
  UpdateProcessResponse,
  UpsertSandboxRequest
} from '@aila/model';

export class ApiClient {
  private readonly client: HttpClient;
  public readonly install: InstallApiClient;
  public readonly auth: AuthApiClient;
  public readonly chat: SseTransport;
  public readonly process: ProcessApiClient;
  public readonly sandbox: SandboxApiClient;
  public readonly user: UserApiClient;

  public constructor(authToken: string | null) {
    this.client = new HttpClient(createHeaders(authToken));
    this.install = new InstallApiClient(this.client);
    this.auth = new AuthApiClient(this.client);
    this.chat = new SseTransport(this.client);
    this.process = new ProcessApiClient(this.client);
    this.sandbox = new SandboxApiClient(this.client);
    this.user = new UserApiClient(this.client);
  }

  public get onUnauthorized() {
    return this.client.onUnauthorized;
  }

  public updateAuthToken(authToken: string) {
    this.client.updateHeaders(createHeaders(authToken));
  }
}

function createHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export class InstallApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async install(abortSignal: AbortSignal, request: InstallRequest): Promise<InstallResponse> {
    return this.client.json(abortSignal, 'POST', '/api/install', request);
  }
}

export class AuthApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async login(abortSignal: AbortSignal, request: LoginRequest): Promise<LoginResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/login', request);
  }

  public async refreshToken(abortSignal: AbortSignal, request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.json(abortSignal, 'POST', '/api/auth/token/refresh', request);
  }
}

export class ProcessApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async updateProcess(abortSignal: AbortSignal, request: UpdateProcessRequest): Promise<UpdateProcessResponse> {
    return this.client.json(abortSignal, 'POST', '/api/process', request);
  }

  public async getProcesses(abortSignal: AbortSignal): Promise<GetProcessesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/processes');
  }

  public async getProcess(abortSignal: AbortSignal, id: string): Promise<GetProcessResponse> {
    return this.client.json(abortSignal, 'GET', `/api/processes/${id}`);
  }

  public async testProcess(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<TestProcessUpdate>,
    id: string,
    request: TestProcessRequest
  ) {
    return this.client.sse(abortSignal, listener, 'POST', `/api/processes/${id}/test`, request);
  }
}

export class SandboxApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async upsertSandbox(abortSignal: AbortSignal, request: UpsertSandboxRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/sandbox', request);
  }

  public async getSandboxes(abortSignal: AbortSignal): Promise<GetSandboxesResponse> {
    return this.client.json(abortSignal, 'GET', '/api/sandboxes');
  }

  public async getSandbox(abortSignal: AbortSignal, name: string): Promise<GetSandboxResponse> {
    return this.client.json(abortSignal, 'GET', `/api/sandboxes/${encodeURIComponent(name)}`);
  }
}

export class UserApiClient {
  public constructor(private readonly client: HttpClient) {}

  public async getUsers(abortSignal: AbortSignal): Promise<GetUsersResponse> {
    return this.client.json(abortSignal, 'GET', '/api/users');
  }

  public async getUser(abortSignal: AbortSignal, id: string): Promise<GetUserResponse> {
    return this.client.json(abortSignal, 'GET', `/api/users/${id}`);
  }

  public async updateUser(abortSignal: AbortSignal, request: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.client.json(abortSignal, 'POST', '/api/user', request);
  }
}
