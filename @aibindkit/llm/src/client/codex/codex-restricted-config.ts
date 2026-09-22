import { LlmClientError } from '../llm-client';
import { CodexJsonObject, CodexJsonValue, isCodexJsonObject } from './codex-protocol';
import { CodexAppServerConnection } from './codex-app-server-connection';

const restrictedFeatures = new Set([
  'apps',
  'artifact',
  'browser_use',
  'browser_use_external',
  'browser_use_full_cdp_access',
  'chronicle',
  'code_mode',
  'code_mode_only',
  'computer_use',
  'current_time_reminder',
  'default_mode_request_user_input',
  'deferred_executor',
  'goals',
  'hooks',
  'image_generation',
  'memories',
  'multi_agent',
  'multi_agent_v2',
  'plugins',
  'request_permissions_tool',
  'skill_search',
  'shell_tool',
  'standalone_web_search',
  'token_budget',
  'unified_exec',
  'view_image',
  'web_search_cached',
  'web_search_request',
  'workspace_dependencies'
]);

const featureAliases = new Map([
  ['connectors', 'apps'],
  ['imagegenext', 'image_generation'],
  ['collab', 'multi_agent'],
  ['memory_tool', 'memories'],
  ['telepathy', 'chronicle'],
  ['codex_hooks', 'hooks']
]);

const overridableLayerTypes = new Set(['packagedDefaults', 'mdm', 'system', 'enterpriseManaged', 'user', 'project', 'sessionFlags']);

const emptyHooks: CodexJsonObject = {
  PreToolUse: [],
  PermissionRequest: [],
  PostToolUse: [],
  PreCompact: [],
  PostCompact: [],
  SessionStart: [],
  UserPromptSubmit: [],
  SubagentStart: [],
  SubagentStop: [],
  Stop: []
};

export async function createRestrictedCodexConfig(connection: CodexAppServerConnection, signal: AbortSignal): Promise<CodexJsonObject> {
  const [requirements, current] = await Promise.all([
    connection.request<unknown>('configRequirements/read', undefined, signal),
    connection.request<unknown>('config/read', { includeLayers: true }, signal)
  ]);
  assertRequirementsAllowRestrictedTools(requirements);
  assertConfigCanBeOverridden(current);

  const config: CodexJsonObject = {
    'agents.enabled': false,
    'orchestrator.mcp.enabled': false,
    'orchestrator.skills.enabled': false,
    'skills.bundled.enabled': false,
    'skills.include_instructions': false,
    'tools.experimental_request_user_input.enabled': false,
    'tools.update_plan.enabled': false,
    project_doc_max_bytes: 0,
    hooks: emptyHooks,
    notify: [],
    web_search: 'disabled'
  };
  for (const feature of restrictedFeatures) {
    config[`features.${feature}`] = false;
  }

  const inheritedMcpServers = readInheritedMcpServers(current);
  if (Object.keys(inheritedMcpServers).length > 0) {
    config.mcp_servers = inheritedMcpServers;
  }
  return config;
}

export async function attestRestrictedCodexThread(
  connection: CodexAppServerConnection,
  threadId: string,
  signal: AbortSignal
): Promise<void> {
  const response = await connection.request<unknown>('mcpServerStatus/list', { threadId, detail: 'toolsAndAuthOnly' }, signal);
  if (!isCodexJsonObject(response) || !Array.isArray(response.data)) {
    throw new LlmClientError('Codex app-server returned an invalid MCP status response');
  }
  for (const item of response.data) {
    if (!isCodexJsonObject(item) || !isCodexJsonObject(item.tools)) {
      throw new LlmClientError('Codex app-server returned an invalid MCP server status');
    }
    if (item.serverInfo !== null || Object.keys(item.tools).length > 0) {
      throw new LlmClientError(`Codex restricted tool surface contains active MCP server ${String(item.name ?? '')}`);
    }
  }
}

function assertRequirementsAllowRestrictedTools(response: unknown): void {
  if (!isCodexJsonObject(response) || !('requirements' in response)) {
    throw new LlmClientError('Codex app-server returned invalid configuration requirements');
  }
  if (response.requirements === null) {
    return;
  }
  if (!isCodexJsonObject(response.requirements)) {
    throw new LlmClientError('Codex app-server returned invalid configuration requirements');
  }
  for (const key of ['hooks', 'managedHooks', 'managed_hooks']) {
    const hooks = response.requirements[key];
    if (hooks === undefined || hooks === null) {
      continue;
    }
    if (!isCodexJsonObject(hooks)) {
      throw new LlmClientError('Codex app-server returned invalid managed hooks');
    }
    if (hasNonEmptyJsonValue(hooks)) {
      throw new LlmClientError('Codex managed requirements force forbidden hooks');
    }
  }
  for (const key of ['featureRequirements', 'feature_requirements']) {
    const required = response.requirements[key];
    if (required === undefined || required === null) {
      continue;
    }
    if (!isCodexJsonObject(required)) {
      throw new LlmClientError('Codex app-server returned invalid feature requirements');
    }
    for (const [feature, enabled] of Object.entries(required)) {
      if (typeof enabled !== 'boolean') {
        throw new LlmClientError('Codex app-server returned invalid feature requirements');
      }
      const canonical = featureAliases.get(feature) ?? feature;
      if (enabled === true && restrictedFeatures.has(canonical)) {
        throw new LlmClientError(`Codex managed requirements force forbidden feature ${feature}`);
      }
    }
  }
}

function assertConfigCanBeOverridden(response: unknown): void {
  if (!isCodexJsonObject(response) || !isCodexJsonObject(response.config) || !Array.isArray(response.layers)) {
    throw new LlmClientError('Codex app-server returned an invalid effective configuration');
  }
  for (const layer of response.layers) {
    if (!isCodexJsonObject(layer) || !isCodexJsonObject(layer.name) || typeof layer.name.type !== 'string') {
      throw new LlmClientError('Codex app-server returned invalid configuration layers');
    }
    if (!overridableLayerTypes.has(layer.name.type)) {
      throw new LlmClientError(`Codex restricted tool surface cannot override configuration layer ${layer.name.type}`);
    }
  }
}

function hasNonEmptyJsonValue(value: CodexJsonValue): boolean {
  if (value === null || value === false || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.values(value).some(hasNonEmptyJsonValue);
  }
  return true;
}

function readInheritedMcpServers(response: unknown): CodexJsonObject {
  if (!isCodexJsonObject(response) || !isCodexJsonObject(response.config)) {
    return {};
  }
  const servers = response.config.mcp_servers;
  if (!isCodexJsonObject(servers)) {
    return {};
  }
  const disabled: CodexJsonObject = {};
  for (const name of Object.keys(servers)) {
    disabled[name] = { enabled: false } as CodexJsonValue;
  }
  return disabled;
}
