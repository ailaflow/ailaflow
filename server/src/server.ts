import { KvConfigurationManager } from './configuration/kv/kv-configuration-manager';
import { LicenseManager } from './configuration/license/license-manager';
import { LicenseValidator } from './configuration/license/license-validator';
import { LicenseCheckScheduler } from './schedulers/license-check-scheduler';
import { LicenseEndpoint } from './api/license-configuration/license-status-endpoint';
import { GetLicenseConfigurationEndpoint } from './api/license-configuration/get-license-configuration-endpoint';
import { SaveLicenseConfigurationEndpoint } from './api/license-configuration/save-license-configuration-endpoint';
import { ServerPaths } from './core/server-paths';
import { SandboxInstanceManager } from './sandbox/sandbox-instance-manager';
import { ChatSessionManager, setupServer } from '@aibindkit/express';
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
import { CanInstallEndpoint } from './api/install/can-install-endpoint';
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
import { DeleteProcessEndpoint } from './api/process/delete-process-endpoint';
import { TestProcessEndpoint } from './api/process/test-process-endpoint';
import { GetMyProcessesEndpoint } from './api/my-process/get-my-processes-endpoint';
import { ToolSetProvider } from './chat-session/tool-set-provider';
import { SandboxRepository } from './repositories/sandbox/sandbox-repository';
import { SqliteSandboxRepository } from './repositories/sandbox/sqlite-sandbox-repository';
import { SandboxListQuerier } from './queriers/sandbox-list/sandbox-list-querier';
import { SqliteSandboxListQuerier } from './queriers/sandbox-list/sqlite-sandbox-list-querier';
import { GetSandboxesEndpoint } from './api/sandbox/get-sandboxes-endpoint';
import { GetSandboxEndpoint } from './api/sandbox/get-sandbox-endpoint';
import { UpsertSandboxEndpoint } from './api/sandbox/upsert-sandbox-endpoint';
import { DiagnoseHostEndpoint } from './api/sandbox/diagnose-host-endpoint';
import { ExecuteSandboxCommandEndpoint } from './api/sandbox/execute-sandbox-command-endpoint';
import { UserListQuerier } from './queriers/user-list/user-list-querier';
import { SqliteUserListQuerier } from './queriers/user-list/sqlite-user-list-querier';
import { GetUsersEndpoint } from './api/user/get-users-endpoint';
import { GetUserEndpoint } from './api/user/get-user-endpoint';
import { SaveUserEndpoint } from './api/user/save-user-endpoint';
import { GetUserTelegramConfigurationEndpoint } from './api/user/get-user-telegram-configuration-endpoint';
import { SaveUserTelegramBotEndpoint } from './api/user/save-user-telegram-bot-endpoint';
import { DeleteUserTelegramBotEndpoint } from './api/user/delete-user-telegram-bot-endpoint';
import { ProcessExecutor } from './process-executor/process-executor';
import { ProcessExecutionStore } from './process-executor/process-execution-store';
import { SandboxRpcHandlerProvider } from './sandbox/sandbox-rpc-handler-provider';
import { ReadVariableRpcHandler } from './process-executor/rpc-handlers/read-variable-rpc-handler';
import { WriteVariableRpcHandler } from './process-executor/rpc-handlers/write-variable-rpc-handler';
import { ChatSessionResolver } from './chat-session/chat-session-resolver';
import { ResourceAccessRepository } from './repositories/resource-access/resource-access-repository';
import { SqliteResourceAccessRepository } from './repositories/resource-access/sqlite-resource-access-repository';
import { GetMyProcessesTool } from './chat-session/user-tools/get-my-processes-tool';
import { StartMyProcessTool } from './chat-session/user-tools/start-my-process-tool';
import { LazyProcessExecutor } from './process-executor/lazy-process-executor';
import { EventBus } from './events/event-bus';
import { ProcessExecutionFinishedEventHandler } from './events/process-execution/process-execution-finished-event-handler';
import { ChatSessionStorage } from './chat-session/chat-session-storage';
import { ChatSessionRepository } from './repositories/chat-session/chat-session-repository';
import { SqliteChatSessionRepository } from './repositories/chat-session/sqlite-chat-session-repository';
import {
  PersistedExecutionRepository,
  SqlitePersistedExecutionRepository
} from './repositories/persisted-execution/persisted-execution-repository';
import { OpenMyProcessStartFormTool } from './chat-session/user-tools/open-my-process-start-form-tool';
import { GetMyProcessStartFormEndpoint } from './api/my-process/get-my-process-start-form-endpoint';
import { UserProcessProvider } from './process/user-process-provider';
import { StartMyProcessEndpoint } from './api/my-process/start-my-process-endpoint';
import { TaskRepository } from './repositories/task/task-repository';
import { AssignedTaskRepository } from './repositories/task/assigned-task-repository';
import { SqliteTaskRepository } from './repositories/task/sqlite-task-repository';
import { SqliteAssignedTaskRepository } from './repositories/task/sqlite-assigned-task-repository';
import { TaskCreator } from './task/task-creator';
import { UserAccessExpressionUserQuerier } from './queriers/user-access-expression/user-access-expression-user-querier';
import { SqliteUserAccessExpressionUserQuerier } from './queriers/user-access-expression/sqlite-user-access-expression-user-querier';
import { MyTaskListQuerier } from './queriers/my-task-list/my-task-list-querier';
import { SqliteMyTaskListQuerier } from './queriers/my-task-list/sqlite-my-task-list-querier';
import { GetMyTasksEndpoint } from './api/my-task/get-my-tasks-endpoint';
import { GetMyTaskFormEndpoint } from './api/my-task/get-my-task-form-endpoint';
import { GetTaskVariableValueEndpoint } from './api/my-task/get-task-variable-value-endpoint';
import { SubmitMyTaskEndpoint } from './api/my-task/submit-my-task-endpoint';
import { ProcessExecutionPersister } from './process-executor/process-execution-persister';
import { UserChatSessionProvider } from './chat-session/user-chat-session-provider';
import { AdminChatSessionProvider } from './chat-session/admin-chat-session-provider';
import { ProcessExecutionResumer } from './process-executor/process-execution-resumer';
import { UserAssignedTaskProvider } from './task/user-assigned-task-provider';
import { Notifier } from './process-executor/services/notifier';
import { NotificationRepository } from './repositories/notification/notification-repository';
import { SqliteNotificationRepository } from './repositories/notification/sqlite-notification-repository';
import { MyNotificationListQuerier } from './queriers/my-notification-list/my-notification-list-querier';
import { SqliteMyNotificationListQuerier } from './queriers/my-notification-list/sqlite-my-notification-list-querier';
import { GetMyNotificationsEndpoint } from './api/my-notification/get-my-notifications-endpoint';
import { DeleteMyNotificationEndpoint } from './api/my-notification/delete-my-notification-endpoint';
import { TableRepository } from './repositories/table/table-repository';
import { SqliteTableRepository } from './repositories/table/sqlite-table-repository';
import { TableDataRepository } from './repositories/table/table-data-repository';
import { SqliteTableDataRepository } from './repositories/table/sqlite-table-data-repository';
import { SqliteTableSchemaRepository } from './repositories/table/sqlite-table-schema-repository';
import { TableSchemaManager } from './table/table-schema-manager';
import { TableListQuerier } from './queriers/table-list/table-list-querier';
import { SqliteTableListQuerier } from './queriers/table-list/sqlite-table-list-querier';
import { GetTablesEndpoint } from './api/table/get-tables-endpoint';
import { GetTableEndpoint } from './api/table/get-table-endpoint';
import { SaveTableEndpoint } from './api/table/save-table-endpoint';
import { DeleteTableEndpoint } from './api/table/delete-table-endpoint';
import { WriteTableRpcHandler } from './process-executor/rpc-handlers/write-table-rpc-handler';
import { TryReadTableRpcHandler } from './process-executor/rpc-handlers/try-read-table-rpc-handler';
import { SqliteTableDataListQuerier } from './queriers/table-data-list/sqlite-table-data-list-querier';
import { TableManager } from './table/table-manager';
import { GetTableDataEndpoint } from './api/table/get-table-data-endpoint';
import { ReadTablePageRpcHandler } from './process-executor/rpc-handlers/read-table-page-rpc-handler';
import { AgentSessionRunner } from './process-executor/services/agent-session-runner';
import { AgentToolSetProviderFactory } from './chat-session/agent-tool-set-provider-factory';
import { ProcessExecutionServices } from './process-executor/services/services';
import { Scheduler } from './schedulers/scheduler';
import { AuthTokenCleanupScheduler } from './schedulers/auth-token-cleanup-scheduler';
import { IncompleteAssignedTaskCountQuerier } from './queriers/task/incomplete-assigned-task-count-querier';
import { SqliteIncompleteAssignedTaskCountQuerier } from './queriers/task/sqlite-incomplete-assigned-task-count-querier';
import { TaskFinalizationCandidateQuerier } from './queriers/task/task-finalization-candidate-querier';
import { SqliteTaskFinalizationCandidateQuerier } from './queriers/task/sqlite-task-finalization-candidate-querier';
import { LlmConfigurationRepository } from './repositories/configuration/llm/llm-configuration-repository';
import { SqliteLlmConfigurationRepository } from './repositories/configuration/llm/sqlite-llm-configuration-repository';
import { LlmClientFactory } from './llm/llm-client-factory';
import { LlmClientProvider } from './llm/llm-client-provider';
import { GetLlmConfigurationEndpoint } from './api/llm-configuration/get-llm-configuration-endpoint';
import { SaveLlmProviderEndpoint } from './api/llm-configuration/save-llm-provider-endpoint';
import { DeleteLlmProviderEndpoint } from './api/llm-configuration/delete-llm-provider-endpoint';
import { SaveLlmUseCaseAssignmentsEndpoint } from './api/llm-configuration/save-llm-use-case-assignments-endpoint';
import { FetchLlmProviderModelsEndpoint } from './api/llm-configuration/fetch-llm-provider-models-endpoint';
import { LlmConfigurationChangedEventHandler } from './events/llm-configuration/llm-configuration-changed-event-handler';
import { SandboxHostDiagnostician } from './sandbox/sandbox-host-diagnostician';
import { ChatAuthContextResolver } from './chat-session/chat-auth-context-resolver';
import { TelegramConfigurationRepository } from './repositories/configuration/telegram/telegram-configuration-repository';
import { SqliteTelegramConfigurationRepository } from './repositories/configuration/telegram/sqlite-telegram-configuration-repository';
import { GetMyTelegramConfigurationEndpoint } from './api/my-configuration/get-my-telegram-configuration-endpoint';
import { SaveMyTelegramBotEndpoint } from './api/my-configuration/save-my-telegram-bot-endpoint';
import { DeleteMyTelegramBotEndpoint } from './api/my-configuration/delete-my-telegram-bot-endpoint';
import { TelegramBotApiClient } from './telegram/telegram-bot-api-client';
import { TelegramConfigurationApi } from './api/common/telegram-configuration-api';
import { TelegramSynchronizationManager } from './telegram/telegram-synchronization-manager';
import { TelegramConfigurationChangedEventHandler } from './events/telegram-configuration/telegram-configuration-changed-event-handler';
import { GetStartedByRpcHandler } from './process-executor/rpc-handlers/get-started-by-rpc-handler';
import { ProcessExecutionResumeListenerStore } from './process-executor/process-execution-resume-listener-store';
import { AssignedTaskCompleter } from './task/assigned-task-completer';
import { TaskFinalizer } from './task/task-finalizer';
import { TaskFinalizationWorker } from './task/task-finalization-worker';
import { SubmitMyTaskTool } from './chat-session/user-tools/submit-my-task-tool';
import { ProcessManager } from './process/process-manager';
import { ProcessDefinitionUpgrader } from './process/process-definition-upgrader';
import { GetMyTasksTool } from './chat-session/user-tools/get-my-tasks-tool';
import { GetMyTaskDetailsTool } from './chat-session/user-tools/get-my-task-details-tool';
import { UserTaskDetailsProvider } from './task/user-task-details-provider';
import { TaskListQuerier } from './queriers/task-list/task-list-querier';
import { SqliteTaskListQuerier } from './queriers/task-list/sqlite-task-list-querier';
import { DeleteTaskEndpoint, GetTasksEndpoint } from './api/task/tasks-endpoint';
import { TaskDeleter } from './task/task-deleter';
import { KvConfigurationRepository } from './repositories/configuration/kv/kv-configuration-repository';
import { SqliteKvConfigurationRepository } from './repositories/configuration/kv/sqlite-kv-configuration-repository';
import { PublicUrlTester } from './configuration/public-url/public-url-tester';
import { HealthEndpoint } from './api/health/health-endpoint';
import { GetPublicUrlConfigurationEndpoint } from './api/public-url-configuration/get-public-url-configuration-endpoint';
import { SavePublicUrlConfigurationEndpoint } from './api/public-url-configuration/save-public-url-configuration-endpoint';
import { TestPublicUrlEndpoint } from './api/public-url-configuration/test-public-url-endpoint';
import { ProcessCronJobRepository } from './repositories/process-cron-job/process-cron-job-repository';
import { SqliteProcessCronJobRepository } from './repositories/process-cron-job/sqlite-process-cron-job-repository';
import { GetProcessCronJobsEndpoint } from './api/process-cron-job/get-process-cron-jobs-endpoint';
import { SaveProcessCronJobEndpoint } from './api/process-cron-job/save-process-cron-job-endpoint';
import { DeleteProcessCronJobEndpoint } from './api/process-cron-job/delete-process-cron-job-endpoint';
import { ProcessCronJobScheduler } from './schedulers/process-cron-job-scheduler';
import { HttpServer } from './http-server';
import { GetSandboxesTool } from './chat-session/admin-tools/get-sandboxes-tool';
import { GetProcessesTool } from './chat-session/admin-tools/get-processes-tool';
import { GetTablesTool } from './chat-session/admin-tools/get-tables-tool';
import { TestProcessTool } from './chat-session/admin-tools/test-process-tool';
import { Installer } from './install/installer';
import { UserExistsRpcHandler } from './process-executor/rpc-handlers/user-exists-rpc-handler';
import { SlackConfigurationRepository } from './repositories/configuration/slack/slack-configuration-repository';
import { SqliteSlackConfigurationRepository } from './repositories/configuration/slack/sqlite-slack-configuration-repository';
import { SlackUserDirectoryRepository } from './repositories/configuration/slack/slack-user-directory-repository';
import { SqliteSlackUserDirectoryRepository } from './repositories/configuration/slack/sqlite-slack-user-directory-repository';
import { SlackUserMappingRepository } from './repositories/configuration/slack/slack-user-mapping-repository';
import { SqliteSlackUserMappingRepository } from './repositories/configuration/slack/sqlite-slack-user-mapping-repository';
import { SlackInboundEventRepository } from './repositories/configuration/slack/slack-inbound-event-repository';
import { SqliteSlackInboundEventRepository } from './repositories/configuration/slack/sqlite-slack-inbound-event-repository';
import { SlackBotApiClient } from './slack/slack-bot-api-client';
import { OfficialSlackSocketClient } from './slack/slack-socket-client';
import { SlackSynchronizationManager } from './slack/slack-synchronization-manager';
import { SlackUserDirectoryRefresher } from './slack/slack-user-directory-refresher';
import { SlackConfigurationManager } from './slack/slack-configuration-manager';
import { SlackMappingManager } from './slack/slack-mapping-manager';
import { SlackStatusProvider } from './slack/slack-status-provider';
import { SlackConfigurationChangedEventHandler } from './events/slack-configuration/slack-configuration-changed-event-handler';
import { SlackMappingsChangedEventHandler } from './events/slack-configuration/slack-mappings-changed-event-handler';
import { GetSlackConfigurationEndpoint } from './api/slack-configuration/get-slack-configuration-endpoint';
import { SaveSlackConfigurationEndpoint } from './api/slack-configuration/save-slack-configuration-endpoint';
import { DeleteSlackConfigurationEndpoint } from './api/slack-configuration/delete-slack-configuration-endpoint';
import { GetSlackUsersEndpoint } from './api/slack-configuration/get-slack-users-endpoint';
import { RefreshSlackUsersEndpoint } from './api/slack-configuration/refresh-slack-users-endpoint';
import { SaveSlackMappingsEndpoint } from './api/slack-configuration/save-slack-mappings-endpoint';
import { GetMySlackConfigurationEndpoint } from './api/my-slack-configuration/get-my-slack-configuration-endpoint';
import { SqliteSlackUserListQuerier } from './queriers/slack-user-list/sqlite-slack-user-list-querier';

export class Server {
  private isClosed = false;

  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const serverPaths = new ServerPaths();
    const httpServer = new HttpServer(serverPaths);
    const sandboxHostDiagnostician = new SandboxHostDiagnostician(serverPaths);
    let userRepository: UserRepository;
    let userAttributesRepository: UserAttributesRepository;
    let resourceAccessRepository: ResourceAccessRepository;
    let authTokenRepository: AuthTokenRepository;
    let processRepository: ProcessRepository;
    let processCronJobRepository: ProcessCronJobRepository;
    let sandboxRepository: SandboxRepository;
    let chatSessionRepository: ChatSessionRepository;
    let persistedExecutionRepository: PersistedExecutionRepository;
    let taskRepository: TaskRepository;
    let assignedTaskRepository: AssignedTaskRepository;
    let notificationRepository: NotificationRepository;
    let tableRepository: TableRepository;
    let tableDataRepository: TableDataRepository;
    let llmConfigurationRepository: LlmConfigurationRepository;
    let telegramConfigurationRepository: TelegramConfigurationRepository;
    let slackConfigurationRepository: SlackConfigurationRepository;
    let slackUserDirectoryRepository: SlackUserDirectoryRepository;
    let slackUserMappingRepository: SlackUserMappingRepository;
    let slackInboundEventRepository: SlackInboundEventRepository;
    let kvConfigurationRepository: KvConfigurationRepository;

    let processListQuerier: ProcessListQuerier;
    let myProcessListQuerier: MyProcessListQuerier;
    let myProcessAccessQuerier: MyProcessAccessQuerier;
    let sandboxListQuerier: SandboxListQuerier;
    let userListQuerier: UserListQuerier;
    let userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier;
    let myTaskListQuerier: MyTaskListQuerier;
    let myNotificationListQuerier: MyNotificationListQuerier;
    let tableListQuerier: TableListQuerier;
    let incompleteAssignedTaskCountQuerier: IncompleteAssignedTaskCountQuerier;
    let taskFinalizationCandidateQuerier: TaskFinalizationCandidateQuerier;
    let taskListQuerier: TaskListQuerier;

    const sqliteDatabases = new SqliteDatabases(serverPaths);

    userRepository = new SqliteUserRepository(sqliteDatabases);
    userAttributesRepository = new SqliteUserAttributesRepository(sqliteDatabases);
    resourceAccessRepository = new SqliteResourceAccessRepository(sqliteDatabases);
    authTokenRepository = new SqliteAuthTokenRepository(sqliteDatabases);
    processRepository = new SqliteProcessRepository(sqliteDatabases);
    processCronJobRepository = new SqliteProcessCronJobRepository(sqliteDatabases);
    sandboxRepository = new SqliteSandboxRepository(sqliteDatabases);
    chatSessionRepository = new SqliteChatSessionRepository(sqliteDatabases);
    persistedExecutionRepository = new SqlitePersistedExecutionRepository(sqliteDatabases);
    taskRepository = new SqliteTaskRepository(sqliteDatabases);
    assignedTaskRepository = new SqliteAssignedTaskRepository(sqliteDatabases);
    notificationRepository = new SqliteNotificationRepository(sqliteDatabases);
    const tableSchemaManager = new TableSchemaManager(new SqliteTableSchemaRepository(sqliteDatabases));
    tableRepository = new SqliteTableRepository(sqliteDatabases);
    tableDataRepository = new SqliteTableDataRepository(sqliteDatabases);
    llmConfigurationRepository = new SqliteLlmConfigurationRepository(sqliteDatabases);
    telegramConfigurationRepository = new SqliteTelegramConfigurationRepository(sqliteDatabases);
    slackConfigurationRepository = new SqliteSlackConfigurationRepository(sqliteDatabases);
    slackUserDirectoryRepository = new SqliteSlackUserDirectoryRepository(sqliteDatabases);
    slackUserMappingRepository = new SqliteSlackUserMappingRepository(sqliteDatabases);
    slackInboundEventRepository = new SqliteSlackInboundEventRepository(sqliteDatabases);
    kvConfigurationRepository = new SqliteKvConfigurationRepository(sqliteDatabases);

    processListQuerier = new SqliteProcessListQuerier(sqliteDatabases);
    myProcessListQuerier = new SqliteMyProcessListQuerier(sqliteDatabases);
    myProcessAccessQuerier = new SqliteMyProcessAccessQuerier(sqliteDatabases);
    sandboxListQuerier = new SqliteSandboxListQuerier(sqliteDatabases);
    userListQuerier = new SqliteUserListQuerier(sqliteDatabases);
    userAccessExpressionUserQuerier = new SqliteUserAccessExpressionUserQuerier(sqliteDatabases);
    myTaskListQuerier = new SqliteMyTaskListQuerier(sqliteDatabases);
    myNotificationListQuerier = new SqliteMyNotificationListQuerier(sqliteDatabases);
    tableListQuerier = new SqliteTableListQuerier(sqliteDatabases);
    const tableDataListQuerier = new SqliteTableDataListQuerier(sqliteDatabases);
    const tableManager = new TableManager(tableRepository, tableDataRepository, tableSchemaManager, tableDataListQuerier);
    incompleteAssignedTaskCountQuerier = new SqliteIncompleteAssignedTaskCountQuerier(sqliteDatabases);
    taskFinalizationCandidateQuerier = new SqliteTaskFinalizationCandidateQuerier(sqliteDatabases);
    taskListQuerier = new SqliteTaskListQuerier(sqliteDatabases);
    const slackUserListQuerier = new SqliteSlackUserListQuerier(sqliteDatabases);

    await Promise.all([
      userRepository.setup(abortSignal),
      userAttributesRepository.setup(abortSignal),
      resourceAccessRepository.setup(abortSignal),
      authTokenRepository.setup(abortSignal),
      processRepository.setup(abortSignal),
      processCronJobRepository.setup(abortSignal),
      sandboxRepository.setup(abortSignal),
      chatSessionRepository.setup(abortSignal),
      persistedExecutionRepository.setup(abortSignal),
      taskRepository.setup(abortSignal),
      assignedTaskRepository.setup(abortSignal),
      notificationRepository.setup(abortSignal),
      tableRepository.setup(abortSignal),
      llmConfigurationRepository.setup(abortSignal),
      telegramConfigurationRepository.setup(abortSignal),
      slackConfigurationRepository.setup(abortSignal),
      slackUserDirectoryRepository.setup(abortSignal),
      slackUserMappingRepository.setup(abortSignal),
      slackInboundEventRepository.setup(abortSignal),
      kvConfigurationRepository.setup(abortSignal)
    ]);

    const processExecutionStore = new ProcessExecutionStore();
    const rpcHandler = new SandboxRpcHandlerProvider([
      new ReadVariableRpcHandler(processExecutionStore),
      new WriteVariableRpcHandler(processExecutionStore),
      new ReadTablePageRpcHandler(tableManager),
      new WriteTableRpcHandler(tableManager),
      new TryReadTableRpcHandler(tableManager),
      new GetStartedByRpcHandler(processExecutionStore),
      new UserExistsRpcHandler(userRepository)
    ]);

    const sessionManager = new ChatSessionManager();
    const sessionStorage = new ChatSessionStorage(chatSessionRepository);
    const userChatSessionProvider = new UserChatSessionProvider(sessionManager);
    const adminChatSessionProvider = new AdminChatSessionProvider(sessionManager);

    const sandboxInstanceManager = new SandboxInstanceManager(serverPaths, sandboxRepository, rpcHandler);

    const taskCreator = new TaskCreator(taskRepository, assignedTaskRepository, userAccessExpressionUserQuerier, userChatSessionProvider);
    const notifier = new Notifier(userAccessExpressionUserQuerier, userChatSessionProvider, notificationRepository);

    const llmClientFactory = new LlmClientFactory();
    const llmClientProvider = new LlmClientProvider(llmConfigurationRepository, llmClientFactory);
    const publicUrlTester = new PublicUrlTester();

    const eventBus = new EventBus();
    eventBus.registerHandler(new ProcessExecutionFinishedEventHandler(userChatSessionProvider, adminChatSessionProvider));
    eventBus.registerHandler(new LlmConfigurationChangedEventHandler(llmClientProvider, sessionManager));

    const telegramClient = new TelegramBotApiClient();
    const telegramConfigurationApi = new TelegramConfigurationApi(telegramConfigurationRepository, telegramClient, eventBus);
    const telegramSynchronizationManager = new TelegramSynchronizationManager(
      telegramConfigurationRepository,
      telegramClient,
      userChatSessionProvider
    );
    eventBus.registerHandler(new TelegramConfigurationChangedEventHandler(telegramSynchronizationManager));

    const slackClient = new SlackBotApiClient();
    const slackSynchronizationManager = new SlackSynchronizationManager(
      slackConfigurationRepository,
      slackUserDirectoryRepository,
      slackUserMappingRepository,
      slackInboundEventRepository,
      slackClient,
      new OfficialSlackSocketClient(),
      userChatSessionProvider
    );
    const slackDirectoryRefresher = new SlackUserDirectoryRefresher(
      slackConfigurationRepository,
      slackUserDirectoryRepository,
      slackClient,
      eventBus
    );
    const slackConfigurationManager = new SlackConfigurationManager(
      slackConfigurationRepository,
      slackUserDirectoryRepository,
      slackUserMappingRepository,
      slackClient,
      slackSynchronizationManager,
      eventBus
    );
    const slackMappingManager = new SlackMappingManager(
      slackConfigurationRepository,
      slackUserDirectoryRepository,
      slackUserMappingRepository,
      slackUserListQuerier,
      userRepository,
      eventBus
    );
    const slackStatusProvider = new SlackStatusProvider(
      slackConfigurationRepository,
      slackUserDirectoryRepository,
      slackUserMappingRepository,
      slackSynchronizationManager
    );
    eventBus.registerHandler(new SlackConfigurationChangedEventHandler(slackSynchronizationManager));
    eventBus.registerHandler(new SlackMappingsChangedEventHandler(slackSynchronizationManager));

    const processExecutionPersister = new ProcessExecutionPersister(persistedExecutionRepository);
    const processDefinitionUpgrader = new ProcessDefinitionUpgrader();
    const processManager = new ProcessManager(processRepository, processDefinitionUpgrader);

    const agentToolSetProviderFactory = new AgentToolSetProviderFactory(
      processListQuerier,
      processManager,
      sandboxInstanceManager,
      processExecutionStore
    );
    const agentSessionRunner = new AgentSessionRunner(llmClientProvider, agentToolSetProviderFactory, serverPaths);
    const processExecutionServices: ProcessExecutionServices = {
      sandboxInstanceManager,
      taskCreator,
      notifier,
      agentSessionRunner
    };

    const processExecutor = new ProcessExecutor(processExecutionStore, processExecutionPersister, processExecutionServices);
    const lazyProcessExecutor = new LazyProcessExecutor(processExecutor, eventBus);
    const processExecutionResumeListenerStore = new ProcessExecutionResumeListenerStore();
    const processExecutionResumer = new ProcessExecutionResumer(
      processManager,
      persistedExecutionRepository,
      processExecutor,
      processExecutionResumeListenerStore,
      eventBus
    );

    const passwordHasher = new PasswordHasher();
    const userProcessProvider = new UserProcessProvider(myProcessAccessQuerier, processManager);
    const userAssignedTaskProvider = new UserAssignedTaskProvider(taskRepository, assignedTaskRepository);
    const userTaskDetailsProvider = new UserTaskDetailsProvider(userAssignedTaskProvider, persistedExecutionRepository);
    const taskFinalizer = new TaskFinalizer(
      assignedTaskRepository,
      taskRepository,
      incompleteAssignedTaskCountQuerier,
      processExecutionResumer
    );
    const taskFinalizationWorker = new TaskFinalizationWorker(taskFinalizationCandidateQuerier, taskFinalizer, taskRepository);
    const assignedTaskCompleter = new AssignedTaskCompleter(
      userAssignedTaskProvider,
      userChatSessionProvider,
      assignedTaskRepository,
      taskRepository,
      taskFinalizationWorker
    );
    const taskDeleter = new TaskDeleter(taskRepository, persistedExecutionRepository);

    const userToolSetProvider = new ToolSetProvider([
      new GetMyProcessesTool(myProcessListQuerier),
      new GetMyTasksTool(myTaskListQuerier),
      new GetMyTaskDetailsTool(userTaskDetailsProvider),
      new StartMyProcessTool(userProcessProvider, lazyProcessExecutor),
      new OpenMyProcessStartFormTool(userProcessProvider),
      new SubmitMyTaskTool(assignedTaskCompleter)
    ]);

    const adminToolSetProvider = new ToolSetProvider([
      new GetSandboxesTool(sandboxListQuerier),
      new GetProcessesTool(processListQuerier),
      new GetTablesTool(tableListQuerier),
      new TestProcessTool(processManager, lazyProcessExecutor)
    ]);

    const authMiddleware = new AuthMiddleware(authTokenRepository);
    const sessionResolver = new ChatSessionResolver(llmClientProvider, userToolSetProvider, adminToolSetProvider, serverPaths);
    const authContextResolver = new ChatAuthContextResolver();

    setupServer(httpServer.app, {
      sessionResolver,
      sessionStorage,
      sessionManager,
      authContextResolver,
      middleware: authMiddleware.user
    });

    const kvConfigurationManager = new KvConfigurationManager(kvConfigurationRepository);
    const licenseManager = new LicenseManager(new LicenseValidator(), kvConfigurationManager);
    const installer = new Installer(userRepository, userAttributesRepository, sandboxRepository, passwordHasher, licenseManager);

    const schedulers: Scheduler[] = [
      new LicenseCheckScheduler(licenseManager),
      new AuthTokenCleanupScheduler(authTokenRepository),
      new ProcessCronJobScheduler(processCronJobRepository, processManager, lazyProcessExecutor)
    ];

    const endpoints = [
      new HealthEndpoint(),
      new LicenseEndpoint(licenseManager),
      new GetLicenseConfigurationEndpoint(kvConfigurationManager),
      new SaveLicenseConfigurationEndpoint(licenseManager),
      new CanInstallEndpoint(installer),
      new InstallEndpoint(installer),
      new LoginEndpoint(userRepository, authTokenRepository, passwordHasher),
      new RefreshAuthTokenEndpoint(authTokenRepository),
      new GetLlmConfigurationEndpoint(llmConfigurationRepository),
      new SaveLlmProviderEndpoint(llmConfigurationRepository, eventBus),
      new FetchLlmProviderModelsEndpoint(llmConfigurationRepository, llmClientFactory),
      new DeleteLlmProviderEndpoint(llmConfigurationRepository, eventBus),
      new SaveLlmUseCaseAssignmentsEndpoint(llmConfigurationRepository, eventBus),
      new GetPublicUrlConfigurationEndpoint(kvConfigurationManager),
      new SavePublicUrlConfigurationEndpoint(kvConfigurationManager),
      new TestPublicUrlEndpoint(kvConfigurationManager, publicUrlTester),
      new GetMyTelegramConfigurationEndpoint(telegramConfigurationApi),
      new SaveMyTelegramBotEndpoint(telegramConfigurationApi),
      new DeleteMyTelegramBotEndpoint(telegramConfigurationApi),
      new GetSlackConfigurationEndpoint(slackConfigurationManager),
      new SaveSlackConfigurationEndpoint(slackConfigurationManager),
      new DeleteSlackConfigurationEndpoint(slackConfigurationManager),
      new GetSlackUsersEndpoint(slackMappingManager),
      new RefreshSlackUsersEndpoint(slackDirectoryRefresher),
      new SaveSlackMappingsEndpoint(slackMappingManager),
      new GetMySlackConfigurationEndpoint(slackStatusProvider),
      new GetMyNotificationsEndpoint(myNotificationListQuerier),
      new DeleteMyNotificationEndpoint(notificationRepository),
      new GetMyProcessesEndpoint(myProcessListQuerier),
      new GetMyTasksEndpoint(myTaskListQuerier),
      new GetTasksEndpoint(taskListQuerier),
      new DeleteTaskEndpoint(taskDeleter),
      new GetMyTaskFormEndpoint(userAssignedTaskProvider),
      new GetTaskVariableValueEndpoint(userTaskDetailsProvider),
      new SubmitMyTaskEndpoint(assignedTaskCompleter),
      new GetMyProcessStartFormEndpoint(userProcessProvider),
      new StartMyProcessEndpoint(userProcessProvider, lazyProcessExecutor, sessionManager),
      new GetProcessesEndpoint(processListQuerier),
      new GetProcessEndpoint(processManager),
      new DeleteProcessEndpoint(processManager),
      new SaveProcessEndpoint(processRepository, processManager, resourceAccessRepository, sandboxListQuerier),
      new TestProcessEndpoint(processManager, processExecutor, processExecutionResumeListenerStore),
      new GetProcessCronJobsEndpoint(processManager, processCronJobRepository),
      new SaveProcessCronJobEndpoint(processManager, processCronJobRepository),
      new DeleteProcessCronJobEndpoint(processCronJobRepository),
      new GetTablesEndpoint(tableListQuerier),
      new GetTableEndpoint(tableManager),
      new GetTableDataEndpoint(tableManager),
      new SaveTableEndpoint(tableManager),
      new DeleteTableEndpoint(tableManager),
      new GetSandboxesEndpoint(sandboxListQuerier),
      new DiagnoseHostEndpoint(sandboxHostDiagnostician),
      new GetSandboxEndpoint(sandboxRepository),
      new UpsertSandboxEndpoint(sandboxRepository, sandboxInstanceManager),
      new ExecuteSandboxCommandEndpoint(sandboxInstanceManager),
      new GetUsersEndpoint(userListQuerier),
      new GetUserEndpoint(userRepository, userAttributesRepository),
      new SaveUserEndpoint(userRepository, userAttributesRepository, passwordHasher),
      new GetUserTelegramConfigurationEndpoint(userRepository, telegramConfigurationApi),
      new SaveUserTelegramBotEndpoint(userRepository, telegramConfigurationApi),
      new DeleteUserTelegramBotEndpoint(userRepository, telegramConfigurationApi)
    ];
    const router = new Router(httpServer.app, endpoints, authMiddleware);
    router.setup();

    httpServer.setupPortal();

    await telegramSynchronizationManager.start(abortSignal);

    for (const scheduler of schedulers) {
      scheduler.start();
    }
    taskFinalizationWorker.start();

    await httpServer.start();
    slackSynchronizationManager.start();
    return new Server(
      httpServer,
      sandboxInstanceManager,
      sqliteDatabases,
      schedulers,
      telegramSynchronizationManager,
      slackSynchronizationManager,
      taskFinalizationWorker
    );
  }

  public constructor(
    private readonly httpServer: HttpServer,
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly sqliteDatabases: SqliteDatabases,
    private readonly schedulers: Scheduler[],
    private readonly telegramSynchronizationManager: TelegramSynchronizationManager,
    private readonly slackSynchronizationManager: SlackSynchronizationManager,
    private readonly taskFinalizationWorker: TaskFinalizationWorker
  ) {}

  public async close() {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    const abortSignal = new AbortController().signal;

    this.telegramSynchronizationManager.stop();
    await this.slackSynchronizationManager.stop();
    await this.sandboxInstanceManager.stopAll(abortSignal);
    for (const scheduler of this.schedulers) {
      scheduler.stop();
    }
    this.taskFinalizationWorker.stop();
    this.sqliteDatabases.dispose();

    await this.httpServer.close();
  }
}
