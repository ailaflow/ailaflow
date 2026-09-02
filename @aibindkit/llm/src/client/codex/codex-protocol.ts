export type CodexJsonPrimitive = string | number | boolean | null;
export type CodexJsonValue = CodexJsonPrimitive | CodexJsonValue[] | { [key: string]: CodexJsonValue };
export type CodexJsonObject = { [key: string]: CodexJsonValue };
export type CodexRequestId = string | number;

export interface CodexServerRequest {
  id: CodexRequestId;
  method: string;
  params?: unknown;
}

export interface CodexNotification {
  method: string;
  params?: unknown;
}

export interface CodexDynamicToolSpec {
  type: 'function';
  name: string;
  description: string;
  inputSchema: CodexJsonValue;
}

export interface CodexDynamicToolCall {
  threadId: string;
  turnId: string;
  callId: string;
  namespace: string | null;
  tool: string;
  arguments: CodexJsonValue;
}

export interface CodexDynamicToolResponse {
  contentItems: Array<{ type: 'inputText'; text: string }>;
  success: boolean;
}

export interface CodexModel {
  id: string;
  model?: string;
  hidden?: boolean;
  isDefault?: boolean;
}

export interface CodexThread {
  id: string;
  ephemeral?: boolean;
}

export interface CodexTurn {
  id: string;
  status: string;
  error?: { message?: string } | null;
}

export function isCodexJsonObject(value: unknown): value is CodexJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readCodexDynamicToolCall(value: unknown): CodexDynamicToolCall | null {
  if (!isCodexJsonObject(value)) {
    return null;
  }
  const { threadId, turnId, callId, namespace, tool, arguments: args } = value;
  if (
    typeof threadId !== 'string' ||
    typeof turnId !== 'string' ||
    typeof callId !== 'string' ||
    (namespace !== null && namespace !== undefined && typeof namespace !== 'string') ||
    typeof tool !== 'string'
  ) {
    return null;
  }
  return {
    threadId,
    turnId,
    callId,
    namespace: namespace ?? null,
    tool,
    arguments: isCodexJsonValue(args) ? args : null
  };
}

function isCodexJsonValue(value: unknown): value is CodexJsonValue {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isCodexJsonValue);
  }
  return isCodexJsonObject(value) && Object.values(value).every(isCodexJsonValue);
}
