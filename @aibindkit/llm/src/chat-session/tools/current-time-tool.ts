import type { ToolDescriptor } from '@aibindkit/core';
import { Tool, ToolExecutionResult } from './tool';

export class CurrentTimeTool implements Tool {
  public readonly descriptor: ToolDescriptor = {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Gets the current time in ISO 8601 format',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  };

  public async execute(): Promise<ToolExecutionResult> {
    return {
      content: new Date().toISOString()
    };
  }
}
