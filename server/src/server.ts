import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';
import express from 'express';
import { SandboxManager } from './managers/sandbox-manager';
import { SandboxExecutorManager } from './managers/sandbox-executor-manager';
import { OpenaiLlmClient } from './llm-client/openai-llm-client';
import { LoginEndpoint } from './api/auth/login-endpoint';
import { Router } from './api/router';
import { UserRepository } from './repositories/user-repository/user-repository';
import { SqliteUserRepository } from './repositories/user-repository/sqlite-user-repository';
import { PasswordHasher } from './repositories/user-repository/password-hasher';
import { SqliteAuthTokenRepository } from './repositories/auth-token-repository/sqlite-auth-token-repository';
import { AuthTokenRepository } from './repositories/auth-token-repository/auth-token-repository';
import { RefreshAuthTokenEndpoint } from './api/auth/refresh-auth-token-endpoint';
import { AuthMiddleware } from './api/auth/auth-middleware';
import { InstallEndpoint } from './api/install/install-endpoint';
import { RestoreSessionEndpoint } from './api/chat-session/restore-chat-endpoint';
import { SendChatMessageEndpoint } from './api/chat-session/send-chat-message-endpoint';
import { GetProcessesEndpoint } from './api/process/get-processes-endpoint';
import { UpdateProcessEndpoint } from './api/process/update-process-endpoint';
import { ProcessRepository } from './repositories/process-repository/process-repository';
import { SqliteDatabases } from './core/sqlite-databases';
import { SqliteProcessRepository } from './repositories/process-repository/sqlite-process-repository';
import { ProcessListQuerier } from './queriers/process-list/process-list-querier';
import { SqliteProcessListQuerier } from './queriers/process-list/sqlite-process-list-querier';
import { GetProcessEndpoint } from './api/process/get-process-endpoint';
import { TestProcessEndpoint } from './api/process/test-process-endpoint';
import { SendFrontedToolResultEndpoint } from './api/chat-session/send-frontend-tool-result-endpoint';
import { FrontendToolBus } from './chat-session/tools/frontend-tool-bus';
import { ChatSessionFactory } from './chat-session/chat-session-factory';
import { UserChatSessionStore } from './chat-session/stores/user-chat-session-store';
import { UserToolSetProvider } from './chat-session/stores/user-tool-set-provider';
import { AdminChatSessionStore } from './chat-session/stores/admin-chat-session-store';
import { FrontendToolFactory } from './chat-session/tools/frontend-tool-factory';
import { ChatSessionStore } from './chat-session/stores/chat-session-store';
import { ContainerRepository } from './repositories/container-repository/container-repository';
import { SqliteContainerRepository } from './repositories/container-repository/sqlite-container-repository';
import { ContainerListQuerier } from './queriers/container-list/container-list-querier';
import { SqliteContainerListQuerier } from './queriers/container-list/sqlite-container-list-querier';
import { GetContainersEndpoint } from './api/container/get-containers-endpoint';
import { GetContainerEndpoint } from './api/container/get-container-endpoint';
import { UpsertContainerEndpoint } from './api/container/upsert-container-endpoint';

const PORT = process.env.PORT || 2048;

const logger = new Logger('Server');

export class Server {
  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const app = express();
    app.use(express.json());

    const serverPaths = new ServerPaths();
    let userRepository: UserRepository;
    let authTokenRepository: AuthTokenRepository;
    let processRepository: ProcessRepository;
    let containerRepository: ContainerRepository;
    let processListQuerier: ProcessListQuerier;
    let containerListQuerier: ContainerListQuerier;

    const sqliteDatabases = new SqliteDatabases(serverPaths);

    userRepository = new SqliteUserRepository(sqliteDatabases);
    authTokenRepository = new SqliteAuthTokenRepository(sqliteDatabases);
    processRepository = new SqliteProcessRepository(sqliteDatabases);
    containerRepository = new SqliteContainerRepository(sqliteDatabases);
    processListQuerier = new SqliteProcessListQuerier(sqliteDatabases);
    containerListQuerier = new SqliteContainerListQuerier(sqliteDatabases);

    await Promise.all([
      userRepository.setup(abortSignal),
      authTokenRepository.setup(abortSignal),
      processRepository.setup(abortSignal),
      containerRepository.setup(abortSignal)
    ]);

    const sandboxManager = new SandboxManager(serverPaths);
    const sandboxExecutorManager = new SandboxExecutorManager(sandboxManager);

    const passwordHasher = new PasswordHasher();

    const llmClient = new OpenaiLlmClient();
    const chatSessionFactory = new ChatSessionFactory();
    const userToolSetProvider = new UserToolSetProvider(sandboxExecutorManager);

    const frontendToolBus = new FrontendToolBus();
    const frontendToolFactory = new FrontendToolFactory(frontendToolBus);

    const chatSessionStore = new ChatSessionStore();
    const userChatSessionStore = new UserChatSessionStore(chatSessionStore, chatSessionFactory, llmClient, userToolSetProvider);
    const adminChatSessionStore = new AdminChatSessionStore(chatSessionStore, chatSessionFactory, frontendToolFactory, llmClient);

    const endpoints = [
      new InstallEndpoint(userRepository, passwordHasher),
      new LoginEndpoint(userRepository, authTokenRepository, passwordHasher),
      new RefreshAuthTokenEndpoint(authTokenRepository),
      new RestoreSessionEndpoint(userChatSessionStore, adminChatSessionStore),
      new SendChatMessageEndpoint(chatSessionStore),
      new SendFrontedToolResultEndpoint(frontendToolBus),
      new GetProcessesEndpoint(processListQuerier),
      new GetProcessEndpoint(processRepository),
      new UpdateProcessEndpoint(processRepository),
      new TestProcessEndpoint(processRepository),
      new GetContainersEndpoint(containerListQuerier),
      new GetContainerEndpoint(containerRepository),
      new UpsertContainerEndpoint(containerRepository)
    ];
    const authMiddleware = new AuthMiddleware(authTokenRepository);
    const router = new Router(app, endpoints, authMiddleware);

    router.setup();
    app.listen(PORT, () => {
      logger.log(`Server is running on port ${PORT}`);
    });
    return new Server(sandboxManager, sqliteDatabases);
  }

  public constructor(
    private readonly sandboxManager: SandboxManager,
    private readonly sqliteDatabases: SqliteDatabases
  ) {}

  public async close() {
    this.sandboxManager.stop();
    this.sqliteDatabases.dispose();
  }
}
