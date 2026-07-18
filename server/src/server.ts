import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';
import express from 'express';
import { SandboxInstanceManager } from './sandbox/sandbox-instance-manager';
import { OpenaiLlmClient } from '@aibindkit/llm';
import { setupServer } from '@aibindkit/express';
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
import { GetProcessesEndpoint } from './api/process/get-processes-endpoint';
import { UpdateProcessEndpoint } from './api/process/update-process-endpoint';
import { ProcessRepository } from './repositories/process-repository/process-repository';
import { SqliteDatabases } from './core/sqlite-databases';
import { SqliteProcessRepository } from './repositories/process-repository/sqlite-process-repository';
import { ProcessListQuerier } from './queriers/process-list/process-list-querier';
import { SqliteProcessListQuerier } from './queriers/process-list/sqlite-process-list-querier';
import { GetProcessEndpoint } from './api/process/get-process-endpoint';
import { TestProcessEndpoint } from './api/process/test-process-endpoint';
import { UserToolSetProvider } from './chat-session/user-tools/user-tool-set-provider';
import { SandboxRepository } from './repositories/sandbox-repository/sandbox-repository';
import { SqliteSandboxRepository } from './repositories/sandbox-repository/sqlite-sandbox-repository';
import { SandboxListQuerier } from './queriers/sandbox-list/sandbox-list-querier';
import { SqliteSandboxListQuerier } from './queriers/sandbox-list/sqlite-sandbox-list-querier';
import { GetSandboxesEndpoint } from './api/sandbox/get-sandboxes-endpoint';
import { GetSandboxEndpoint } from './api/sandbox/get-sandbox-endpoint';
import { UpsertSandboxEndpoint } from './api/sandbox/upsert-sandbox-endpoint';
import { ProcessExecutor } from './process-executor/process-executor';
import { ProcessExecutionStore } from './process-executor/process-execution-store';
import { SandboxRpcHandlerProvider } from './sandbox/sandbox-rpc-handler-provider';
import { ReadVariableRpcHandler } from './process-executor/rpc-handlers/read-variable-rpc-handler';
import { WriteVariableRpcHandler } from './process-executor/rpc-handlers/write-variable-rpc-handler';
import { AilaChatSessionResolver } from './chat-session/aila-chat-session-resolver';

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
    let sandboxRepository: SandboxRepository;
    let processListQuerier: ProcessListQuerier;
    let sandboxListQuerier: SandboxListQuerier;

    const sqliteDatabases = new SqliteDatabases(serverPaths);

    userRepository = new SqliteUserRepository(sqliteDatabases);
    authTokenRepository = new SqliteAuthTokenRepository(sqliteDatabases);
    processRepository = new SqliteProcessRepository(sqliteDatabases);
    sandboxRepository = new SqliteSandboxRepository(sqliteDatabases);
    processListQuerier = new SqliteProcessListQuerier(sqliteDatabases);
    sandboxListQuerier = new SqliteSandboxListQuerier(sqliteDatabases);

    await Promise.all([
      userRepository.setup(abortSignal),
      authTokenRepository.setup(abortSignal),
      processRepository.setup(abortSignal),
      sandboxRepository.setup(abortSignal)
    ]);

    const processExecutionStore = new ProcessExecutionStore();
    const rpcHandler = new SandboxRpcHandlerProvider([
      new ReadVariableRpcHandler(processExecutionStore),
      new WriteVariableRpcHandler(processExecutionStore)
    ]);

    const sandboxInstanceManager = new SandboxInstanceManager(serverPaths, sandboxRepository, rpcHandler);

    const workflowMachineFactory = new ProcessExecutor(sandboxInstanceManager, processExecutionStore);

    const passwordHasher = new PasswordHasher();

    const llmClient = new OpenaiLlmClient({
      baseUrl: process.env.AI_PROVIDER_BASE_URL!,
      apiKey: process.env.AI_PROVIDER_API_KEY!
    });
    const userToolSetProvider = new UserToolSetProvider();
    const authMiddleware = new AuthMiddleware(authTokenRepository);
    const chatSessionResolver = new AilaChatSessionResolver(llmClient, userToolSetProvider, serverPaths);

    app.use('/api/chat', (req, res, next) => {
      void authMiddleware.wrap(false, async () => {
        next();
      })(req, res);
    });
    setupServer(app, chatSessionResolver);

    const endpoints = [
      new InstallEndpoint(userRepository, passwordHasher),
      new LoginEndpoint(userRepository, authTokenRepository, passwordHasher),
      new RefreshAuthTokenEndpoint(authTokenRepository),
      new GetProcessesEndpoint(processListQuerier),
      new GetProcessEndpoint(processRepository),
      new UpdateProcessEndpoint(processRepository, sandboxListQuerier),
      new TestProcessEndpoint(processRepository, workflowMachineFactory),
      new GetSandboxesEndpoint(sandboxListQuerier),
      new GetSandboxEndpoint(sandboxRepository),
      new UpsertSandboxEndpoint(sandboxRepository)
    ];
    const router = new Router(app, endpoints, authMiddleware);

    router.setup();
    app.listen(PORT, () => {
      logger.log(`Server is running on port ${PORT}`);
    });
    return new Server(sandboxInstanceManager, sqliteDatabases);
  }

  public constructor(
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly sqliteDatabases: SqliteDatabases
  ) {}

  public async close() {
    this.sandboxInstanceManager.stop();
    this.sqliteDatabases.dispose();
  }
}
