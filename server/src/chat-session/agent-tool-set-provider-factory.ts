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
import { RunProcessTool } from './agent-tools/run-process-tool';
import { RunTerminalCommandTool } from './agent-tools/run-terminal-command-tool';
import { Process } from '../repositories/process/process';
import { ProcessDisplay } from '@ailaflow/shared';

const PAGE_SIZE = 30;

export class AgentToolSetProviderFactory {
  public constructor(
    private readonly processListQuerier: ProcessListQuerier,
    private readonly processManager: ProcessManager,
    private readonly sandboxInstanceManager: SandboxInstanceManager,
    private readonly executionStore: ProcessExecutionStore
  ) {}

  public async create(
    abortSignal: AbortSignal,
    allowedProcesses: string[] | null,
    allowedVariableNames: string[],
    sandboxName: string,
    isTerminalAllowed: boolean,
    process: Process,
    context: ProcessExecutionContext,
    executionId: string
  ): Promise<ToolSetProvider> {
    const tools: Tool[] = [];
    await this.addProcessTools(abortSignal, allowedProcesses, process.name, context, tools, executionId);
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
  }

  private async addProcessTools(
    abortSignal: AbortSignal,
    allowedProcesses: string[] | null,
    currentProcessName: string,
    context: ProcessExecutionContext,
    tools: Tool[],
    executionId: string
  ) {
    if (allowedProcesses === null || allowedProcesses.length > 0) {
      for (let page = 1; ; page++) {
        abortSignal.throwIfAborted();

        const result = await this.processListQuerier.query(abortSignal, page, PAGE_SIZE, ProcessDisplay.LISTED);
        for (const p of result.processes) {
          if (p.name === currentProcessName || context.parentProcessNames?.includes(p.name)) {
            continue;
          }
          if (p.isPausable) {
            continue;
          }
          if (allowedProcesses !== null && !allowedProcesses.includes(p.name)) {
            continue;
          }

          const process = await this.processManager.tryGetByName(abortSignal, p.name);
          if (!process) {
            throw new Error(`Process "${p.name}" was not found in the database`);
          }
          // TODO: Filter allowed non-pausable processes in the database instead of loading every page.
          if (process.isPausable) {
            continue;
          }
          tools.push(new RunProcessTool(executionId, process, this.executionStore));
        }
        if (result.processes.length === 0 || page * result.pageSize >= result.totalCount) {
          break;
        }
      }
    }
    return tools;
  }

  private addTerminalTools(sandboxName: string, tools: Tool[]) {
    tools.push(new RunTerminalCommandTool(sandboxName, this.sandboxInstanceManager));
  }
}
