import type { ToolDescriptor } from '@aibindkit/core';
import { Tool } from './tool';

export class CurrentTimeTool implements Tool {
  public readonly descriptor: ToolDescriptor = {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Gets the current time in ISO 8601 format'
    }
  };

  public async execute(): Promise<string> {
    return new Date().toISOString();
  }
}
