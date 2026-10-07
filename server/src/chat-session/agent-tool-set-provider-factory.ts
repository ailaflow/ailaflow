import { Tool } from '@aibindkit/llm';
import { ProcessListQuerier } from '../queriers/process-list/process-list-querier';
import { ProcessManager } from '../process/process-manager';
import { ProcessExecutionContext } from '../process-executor/process-execution-context';
import { ProcessExecutionStore } from '../process-executor/process-execution-store';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ToolSetProvider } from './tool-set-provider';
import { ListVariablesTool } from './agent-tools/list-variables-tool';
import { ReadVariableTool } from './agent-tools/read-variable-tool';
import { SetVariableTool } from './agent-tools/set-variable-tool';
import { ExecuteProcessTool } from './agent-tools/execute-process-tool';
import { ExecuteTerminalCommandTool } from './agent-tools/execute-terminal-command-tool';
import { Process } from '../repositories/process/process';
import { ProcessDisplay } from '@ailaflow/shared';
import { SleepTool } from './agent-tools/sleep-tool';

const PAGE_SIZE = 30;

export class AgentToolSetProviderFactory {
  public constructor(
    private readonly processListQuerier: ProcessListQuerier,
    private readonly processManager: ProcessManager,
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly executionStore: ProcessExecutionStore
  ) {}

  public async create(
    signal: AbortSignal,
    allowedProcessNames: string[],
    allowedVariableNames: string[],
    sandboxName: string,
    isTerminalAllowed: boolean,
    process: Process,
    context: ProcessExecutionContext,
    executionId: string
  ): Promise<ToolSetProvider> {
    const tools: Tool[] = [];
    await this.addProcessTools(signal, allowedProcessNames, process.name, context, tools, executionId);
    this.addVariableTools(executionId, allowedVariableNames, tools, process);
    if (isTerminalAllowed) {
      this.addTerminalTools(sandboxName, tools);
    }
    return new ToolSetProvider(tools);
  }

  private addVariableTools(executionId: string, allowedVariableNames: string[], tools: Tool[], process: Process) {
    tools.push(new ListVariablesTool(process.definition.properties.variables));
    tools.push(new ReadVariableTool(executionId, allowedVariableNames, this.executionStore));
    tools.push(new SetVariableTool(executionId, allowedVariableNames, this.executionStore));
    tools.push(new SleepTool());
  }

  private async addProcessTools(
    signal: AbortSignal,
    allowedProcessNames: string[],
    currentProcessName: string,
    context: ProcessExecutionContext,
    tools: Tool[],
    executionId: string
  ) {
    if (allowedProcessNames.length === 0) {
      return tools;
    }
    if (allowedProcessNames.includes(currentProcessName)) {
      throw new Error('The current process cannot be included in the allowed process names');
    }

    for (let page = 1; ; page++) {
      signal.throwIfAborted();

      const result = await this.processListQuerier.query(signal, page, PAGE_SIZE, ProcessDisplay.LISTED);
      for (const p of result.processes) {
        if (context.parentProcessNames?.includes(p.name)) {
          continue;
        }
        if (!allowedProcessNames.includes(p.name)) {
          continue;
        }

        const process = await this.processManager.tryGetByName(signal, p.name);
        if (!process) {
          throw new Error(`Process "${p.name}" was not found in the database`);
        }
        // TODO: Filter allowed non-pausable processes in the database instead of loading every page.
        if (process.nTasksSteps > 0) {
          continue;
        }
        tools.push(new ExecuteProcessTool(executionId, process, this.executionStore));
      }
      if (result.processes.length === 0 || page * result.pageSize >= result.totalCount) {
        break;
      }
    }
    return tools;
  }

  private addTerminalTools(sandboxName: string, tools: Tool[]) {
    tools.push(new ExecuteTerminalCommandTool(sandboxName, this.sandboxInstanceManager));
  }
}
