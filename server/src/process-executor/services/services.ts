import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { TaskCreator } from '../../task/task-creator';
import { AgentSessionRunner } from './agent-session-runner';
import { Notifier } from './notifier';

export interface ProcessExecutionServices {
  sandboxInstanceManager: SandboxInstanceManager;
  taskCreator: TaskCreator;
  notifier: Notifier;
  agentSessionRunner: AgentSessionRunner;
}
