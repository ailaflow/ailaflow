import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { Notifier } from './notifier';
import { TaskManager } from './task-manager';

export interface ProcessExecutionServices {
  sandboxInstanceManager: SandboxInstanceManager;
  taskManager: TaskManager;
  notifier: Notifier;
}
