import { VariableDefinition } from '@aila/model';
import { Tool } from '@aibindkit/llm';
import { ProcessListQuerier } from '../queriers/process-list/process-list-querier';
import { ProcessManager } from '../process/process-manager';
import { ProcessExecutionContext } from '../process-executor/process-execution-context';
import { ProcessVariableManager } from '../process-executor/services/process-variable-manager';
import { ProcessExecutor } from '../process-executor/process-executor';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { ToolSetProvider } from './tool-set-provider';
import { ListVariablesTool } from './agent-tools/list-variables-tool';
import { ReadVariableTool } from './agent-tools/read-variable-tool';
import { SetVariableTool } from './agent-tools/set-variable-tool';
import { RunProcessTool } from './agent-tools/run-process-tool';
import { RunTerminalCommandTool } from './agent-tools/run-terminal-command-tool';
import { Process } from '../repositories/process/process';

const PAGE_SIZE = 30;

export class AgentToolSetProviderFactory {
  public constructor(
    private readonly processListQuerier: ProcessListQuerier,
    private readonly processManager: ProcessManager,
    private readonly sandboxInstanceManager: SandboxInstanceManager
  ) {}

  public async create(
    abortSignal: AbortSignal,
    allowedProcesses: string[] | null,
    sandboxName: string,
    isTerminalAllowed: boolean,
    process: Process,
    context: ProcessExecutionContext,
    variableManager: ProcessVariableManager,
    processExecutor: ProcessExecutor
  ): Promise<ToolSetProvider> {
    const tools: Tool[] = [
      new ListVariablesTool(process.definition.properties.variables),
      new ReadVariableTool(variableManager),
      new SetVariableTool(variableManager)
    ];
    await this.addProcessTools(abortSignal, allowedProcesses, process.name, context, tools, processExecutor);
    if (isTerminalAllowed) {
      tools.push(new RunTerminalCommandTool(sandboxName, this.sandboxInstanceManager));
    }
    return new ToolSetProvider(tools);
  }

  private async addProcessTools(
    abortSignal: AbortSignal,
    allowedProcesses: string[] | null,
    currentProcessName: string,
    context: ProcessExecutionContext,
    tools: Tool[],
    processExecutor: ProcessExecutor
  ) {
    if (allowedProcesses === null || allowedProcesses.length > 0) {
      // TODO: Filter allowed non-pausable processes in the database instead of loading every page.
      for (let page = 1; ; page++) {
        abortSignal.throwIfAborted();

        const result = await this.processListQuerier.query(abortSignal, page, PAGE_SIZE);
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
          if (process.isPausable) {
            continue;
          }
          tools.push(new RunProcessTool(process, currentProcessName, context, processExecutor));
        }
        if (result.processes.length === 0 || page * result.pageSize >= result.totalCount) {
          break;
        }
      }
    }
    return tools;
  }
}
