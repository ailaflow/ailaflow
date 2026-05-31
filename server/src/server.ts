import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';
import express from 'express';
import { SandboxManager } from './managers/sandbox-manager';
import { SandboxExecutorManager } from './managers/sandbox-executor-manager';
import { ChatSessionFactory } from './chat-session/chat-session';
import { MessageFactory } from './chat-session/messages/message-factory';
import { ToolSet } from './chat-session/tools/tool-set';
import { CurrentTimeTool } from './chat-session/tools/current-time-tool';
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
import { ChatSessionProvider } from './chat-session/chat-session-provider';
import { SendChatMessageEndpoint } from './api/chat-session/send-chat-message-endpoint';
import { SandboxScriptTool } from './chat-session/tools/sandbox-script-tool';
import { GetProcessesEndpoint } from './api/process/get-processes-endpoint';
import { UpdateProcessEndpoint } from './api/process/update-process-endpoint';
import { ProcessRepository } from './repositories/process-repository/process-repository';
import { SqliteDatabases } from './core/sqlite-databases';
import { SqliteProcessRepository } from './repositories/process-repository/sqlite-process-repository';
import { ProcessListQuerier } from './queriers/process-list/process-list-querier';
import { SqliteProcessListQuerier } from './queriers/process-list/sqlite-process-list-querier';
import { GetProcessEndpoint } from './api/process/get-process-endpoint';

const PORT = process.env.PORT || 3000;

const logger = new Logger('Server');

export class Server {
  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const app = express();
    app.use(express.json());

    const serverPaths = new ServerPaths();
    let userRepository: UserRepository;
    let authTokenRepository: AuthTokenRepository;
    let processRepository: ProcessRepository;
    let processListQuerier: ProcessListQuerier;

    const sqliteDatabases = new SqliteDatabases(serverPaths);

    userRepository = new SqliteUserRepository(sqliteDatabases);
    authTokenRepository = new SqliteAuthTokenRepository(sqliteDatabases);
    processRepository = new SqliteProcessRepository(sqliteDatabases);
    processListQuerier = new SqliteProcessListQuerier(sqliteDatabases);

    await Promise.all([userRepository.setup(abortSignal), authTokenRepository.setup(abortSignal), processRepository.setup(abortSignal)]);

    const sandboxManager = new SandboxManager(serverPaths);
    const sandboxExecutorManager = new SandboxExecutorManager(sandboxManager);

    const passwordHasher = new PasswordHasher();

    const llmClient = new OpenaiLlmClient();
    const toolSet = new ToolSet();
    toolSet.addTool(new CurrentTimeTool());
    toolSet.addTool(new SandboxScriptTool(sandboxExecutorManager));
    const messageFactory = new MessageFactory(llmClient, toolSet);

    const chatSessionFactory = new ChatSessionFactory(messageFactory);
    const chatSessionProvider = new ChatSessionProvider(chatSessionFactory);

    const endpoints = [
      new InstallEndpoint(userRepository, passwordHasher),
      new LoginEndpoint(userRepository, authTokenRepository, passwordHasher),
      new RefreshAuthTokenEndpoint(authTokenRepository),
      new RestoreSessionEndpoint(chatSessionProvider),
      new SendChatMessageEndpoint(chatSessionProvider),
      new GetProcessesEndpoint(processListQuerier),
      new GetProcessEndpoint(processRepository),
      new UpdateProcessEndpoint(processRepository)
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
