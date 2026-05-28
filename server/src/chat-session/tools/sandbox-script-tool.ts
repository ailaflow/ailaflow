import { ToolCall, ToolDescriptor } from '@aila/model';
import { Tool } from './tool';
import { SandboxExecutorManager } from '../../managers/sandbox-executor-manager';

export class SandboxScriptTool implements Tool {
  public readonly descriptor: ToolDescriptor = {
    type: 'function',
    function: {
      name: 'get_currency_rate_pln',
      description: 'Get the current exchange rate of a specified currency against the Polish Zloty (PLN).',
      parameters: {
        type: 'object',
        properties: {
          currency: {
            type: 'string',
            description: 'The currency to get the rate for (e.g., USD, EUR)'
          }
        },
        required: ['currency']
      }
    }
  };

  public constructor(private readonly sandboxExecutorManager: SandboxExecutorManager) {}

  public async execute(abortSignal: AbortSignal, call: ToolCall): Promise<string> {
    const sandboxExecutor = await this.sandboxExecutorManager.get(abortSignal, 'instance_1');

    const result = await sandboxExecutor.execute(abortSignal, {
      folderPath: 'test',
      input: call.function.arguments,
      scriptName: 'test.mjs'
    });

    return result.output ?? 'Script execution did not return any output';
  }
}
