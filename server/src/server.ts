import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';
import express from 'express';
import { SandboxInstanceManager } from './sandbox/sandbox-instance-manager';
import { OpenaiLlmClient } from '@aibindkit/llm';
import { LiveChatSessionStore, setupServer } from '@aibindkit/express';
import { LoginEndpoint } from './api/auth/login-endpoint';
import { Router } from './api/router';
import { UserRepository } from './repositories/user/user-repository';
import { SqliteUserRepository } from './repositories/user/sqlite-user-repository';
import { UserAttributesRepository } from './repositories/user-attributes/user-attributes-repository';
import { SqliteUserAttributesRepository } from './repositories/user-attributes/sqlite-user-attributes-repository';
import { PasswordHasher } from './repositories/user/password-hasher';
import { SqliteAuthTokenRepository } from './repositories/auth-token/sqlite-auth-token-repository';
import { AuthTokenRepository } from './repositories/auth-token/auth-token-repository';
import { RefreshAuthTokenEndpoint } from './api/auth/refresh-auth-token-endpoint';
import { AuthMiddleware } from './api/auth/auth-middleware';
import { InstallEndpoint } from './api/install/install-endpoint';
import { GetProcessesEndpoint } from './api/process/get-processes-endpoint';
import { SaveProcessEndpoint } from './api/process/save-process-endpoint';
import { ProcessRepository } from './repositories/process/process-repository';
import { SqliteDatabases } from './core/sqlite-databases';
import { SqliteProcessRepository } from './repositories/process/sqlite-process-repository';
import { ProcessListQuerier } from './queriers/process-list/process-list-querier';
import { SqliteProcessListQuerier } from './queriers/process-list/sqlite-process-list-querier';
import { MyProcessListQuerier } from './queriers/my-process-list/my-process-list-querier';
import { SqliteMyProcessListQuerier } from './queriers/my-process-list/sqlite-my-process-list-querier';
import { MyProcessAccessQuerier } from './queriers/my-process/my-process-access-querier';
import { SqliteMyProcessAccessQuerier } from './queriers/my-process/sqlite-my-process-access-querier';
import { GetProcessEndpoint } from './api/process/get-process-endpoint';
import { TestProcessEndpoint } from './api/process/test-process-endpoint';
import { GetMyProcessesEndpoint } from './api/my-process/get-my-processes-endpoint';
import { UserToolSetProvider } from './chat-session/user-tools/user-tool-set-provider';
import { SandboxRepository } from './repositories/sandbox/sandbox-repository';
import { SqliteSandboxRepository } from './repositories/sandbox/sqlite-sandbox-repository';
import { SandboxListQuerier } from './queriers/sandbox-list/sandbox-list-querier';
import { SqliteSandboxListQuerier } from './queriers/sandbox-list/sqlite-sandbox-list-querier';
import { GetSandboxesEndpoint } from './api/sandbox/get-sandboxes-endpoint';
import { GetSandboxEndpoint } from './api/sandbox/get-sandbox-endpoint';
import { UpsertSandboxEndpoint } from './api/sandbox/upsert-sandbox-endpoint';
import { UserListQuerier } from './queriers/user-list/user-list-querier';
import { SqliteUserListQuerier } from './queriers/user-list/sqlite-user-list-querier';
import { GetUsersEndpoint } from './api/users/get-users-endpoint';
import { GetUserEndpoint } from './api/users/get-user-endpoint';
import { SaveUserEndpoint } from './api/users/save-user-endpoint';
import { ProcessExecutor } from './process-executor/process-executor';
import { ProcessExecutionStore } from './process-executor/process-execution-store';
import { SandboxRpcHandlerProvider } from './sandbox/sandbox-rpc-handler-provider';
import { ReadVariableRpcHandler } from './process-executor/rpc-handlers/read-variable-rpc-handler';
import { WriteVariableRpcHandler } from './process-executor/rpc-handlers/write-variable-rpc-handler';
import { ChatSessionResolver } from './chat-session/chat-session-resolver';
import { ResourceAccessRepository } from './repositories/resource-access/resource-access-repository';
import { SqliteResourceAccessRepository } from './repositories/resource-access/sqlite-resource-access-repository';
import { MyProcessesTool } from './chat-session/user-tools/my-processes-tool';
import { StartMyProcessTool } from './chat-session/user-tools/start-my-process-tool';
import { LazyProcessExecutor } from './process-executor/lazy-process-executor';
import { EventBus } from './events/event-bus';
import { LazyProcessFinishedEventHandler } from './events/handlers/lazy-process-finished-event-handler';
import { ChatSessionStorage } from './chat-session/chat-session-storage';
import { ChatSessionRepository } from './repositories/chat-session/chat-session-repository';
import { SqliteChatSessionRepository } from './repositories/chat-session/sqlite-chat-session-repository';
import { OpenMyProcessStartFormTool } from './chat-session/user-tools/open-my-process-start-form-tool';
import { GetMyProcessStartFormEndpoint } from './api/my-process/get-my-process-start-form-endpoint';
import { MyProcessProvider } from './providers/my-process-provider';
import { StartMyProcessEndpoint } from './api/my-process/start-my-process-endpoint';
import { TaskRepository } from './repositories/task/task-repository';
import { AssignedTaskRepository } from './repositories/task/assigned-task-repository';
import { SqliteTaskRepository } from './repositories/task/sqlite-task-repository';
import { SqliteAssignedTaskRepository } from './repositories/task/sqlite-assigned-task-repository';
import { TaskManager } from './process-executor/services/task-manager';
import { UserAccessExpressionUserQuerier } from './queriers/user-access-expression/user-access-expression-user-querier';
import { SqliteUserAccessExpressionUserQuerier } from './queriers/user-access-expression/sqlite-user-access-expression-user-querier';
import { MyTaskListQuerier } from './queriers/my-task-list/my-task-list-querier';
import { SqliteMyTaskListQuerier } from './queriers/my-task-list/sqlite-my-task-list-querier';
import { GetMyTasksEndpoint } from './api/my-task/get-my-tasks-endpoint';

const PORT = process.env.PORT || 2048;

const logger = new Logger('Server');

export class Server {
  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const app = express();
    app.use(express.json());

    const serverPaths = new ServerPaths();
    let userRepository: UserRepository;
    let userAttributesRepository: UserAttributesRepository;
    let resourceAccessRepository: ResourceAccessRepository;
    let authTokenRepository: AuthTokenRepository;
    let processRepository: ProcessRepository;
    let sandboxRepository: SandboxRepository;
    let chatSessionRepository: ChatSessionRepository;
    let taskRepository: TaskRepository;
    let assignedTaskRepository: AssignedTaskRepository;

    let processListQuerier: ProcessListQuerier;
    let myProcessListQuerier: MyProcessListQuerier;
    let myProcessAccessQuerier: MyProcessAccessQuerier;
    let sandboxListQuerier: SandboxListQuerier;
    let userListQuerier: UserListQuerier;
    let userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier;
    let myTaskListQuerier: MyTaskListQuerier;

    const sqliteDatabases = new SqliteDatabases(serverPaths);

    userRepository = new SqliteUserRepository(sqliteDatabases);
    userAttributesRepository = new SqliteUserAttributesRepository(sqliteDatabases);
    resourceAccessRepository = new SqliteResourceAccessRepository(sqliteDatabases);
    authTokenRepository = new SqliteAuthTokenRepository(sqliteDatabases);
    processRepository = new SqliteProcessRepository(sqliteDatabases);
    sandboxRepository = new SqliteSandboxRepository(sqliteDatabases);
    chatSessionRepository = new SqliteChatSessionRepository(sqliteDatabases);
    taskRepository = new SqliteTaskRepository(sqliteDatabases);
    assignedTaskRepository = new SqliteAssignedTaskRepository(sqliteDatabases);

    processListQuerier = new SqliteProcessListQuerier(sqliteDatabases);
    myProcessListQuerier = new SqliteMyProcessListQuerier(sqliteDatabases);
    myProcessAccessQuerier = new SqliteMyProcessAccessQuerier(sqliteDatabases);
    sandboxListQuerier = new SqliteSandboxListQuerier(sqliteDatabases);
    userListQuerier = new SqliteUserListQuerier(sqliteDatabases);
    userAccessExpressionUserQuerier = new SqliteUserAccessExpressionUserQuerier(sqliteDatabases);
    myTaskListQuerier = new SqliteMyTaskListQuerier(sqliteDatabases);

    await Promise.all([
      userRepository.setup(abortSignal),
      userAttributesRepository.setup(abortSignal),
      resourceAccessRepository.setup(abortSignal),
      authTokenRepository.setup(abortSignal),
      processRepository.setup(abortSignal),
      sandboxRepository.setup(abortSignal),
      chatSessionRepository.setup(abortSignal),
      taskRepository.setup(abortSignal),
      assignedTaskRepository.setup(abortSignal)
    ]);

    const processExecutionStore = new ProcessExecutionStore();
    const rpcHandler = new SandboxRpcHandlerProvider([
      new ReadVariableRpcHandler(processExecutionStore),
      new WriteVariableRpcHandler(processExecutionStore)
    ]);

    const sessionStorage = new ChatSessionStorage(chatSessionRepository);
    const liveSessionStore = new LiveChatSessionStore();

    const eventBus = new EventBus();
    eventBus.registerHandler(new LazyProcessFinishedEventHandler(liveSessionStore));

    const sandboxInstanceManager = new SandboxInstanceManager(serverPaths, sandboxRepository, rpcHandler);

    const taskManager = new TaskManager(taskRepository, assignedTaskRepository, userAccessExpressionUserQuerier);

    const processExecutor = new ProcessExecutor(sandboxInstanceManager, processExecutionStore, taskManager);
    const lazyProcessExecutor = new LazyProcessExecutor(processExecutor, eventBus);

    const passwordHasher = new PasswordHasher();
    const myProcessProvider = new MyProcessProvider(myProcessAccessQuerier, processRepository);

    const llmClient = new OpenaiLlmClient({
      baseUrl: process.env.AI_PROVIDER_BASE_URL!,
      apiKey: process.env.AI_PROVIDER_API_KEY!
    });
    const userToolSetProvider = new UserToolSetProvider([
      new MyProcessesTool(myProcessListQuerier),
      new StartMyProcessTool(myProcessProvider, lazyProcessExecutor),
      new OpenMyProcessStartFormTool(myProcessProvider)
    ]);

    const authMiddleware = new AuthMiddleware(authTokenRepository);
    const sessionResolver = new ChatSessionResolver(llmClient, userToolSetProvider, serverPaths);

    setupServer(app, {
      sessionResolver,
      liveSessionStore,
      sessionStorage,
      middleware: authMiddleware.user
    });

    const endpoints = [
      new InstallEndpoint(userRepository, userAttributesRepository, sandboxRepository, passwordHasher),
      new LoginEndpoint(userRepository, authTokenRepository, passwordHasher),
      new RefreshAuthTokenEndpoint(authTokenRepository),
      new GetMyProcessesEndpoint(myProcessListQuerier),
      new GetMyTasksEndpoint(myTaskListQuerier),
      new GetMyProcessStartFormEndpoint(myProcessProvider),
      new StartMyProcessEndpoint(myProcessProvider, lazyProcessExecutor, liveSessionStore),
      new GetProcessesEndpoint(processListQuerier),
      new GetProcessEndpoint(processRepository),
      new SaveProcessEndpoint(processRepository, resourceAccessRepository, sandboxListQuerier),
      new TestProcessEndpoint(processRepository, processExecutor),
      new GetSandboxesEndpoint(sandboxListQuerier),
      new GetSandboxEndpoint(sandboxRepository),
      new UpsertSandboxEndpoint(sandboxRepository),
      new GetUsersEndpoint(userListQuerier),
      new GetUserEndpoint(userRepository, userAttributesRepository),
      new SaveUserEndpoint(userRepository, userAttributesRepository, passwordHasher)
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
