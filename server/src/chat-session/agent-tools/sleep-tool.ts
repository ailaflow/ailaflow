import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import * as z from 'zod/v4';
import { abortableSleep } from '../../core/abortable-sleep';

const inputSchema = z.object({ seconds: z.int().min(1).max(10) });

type Input = z.infer<typeof inputSchema>;

export class SleepTool extends ZodTool<Input> {
  public constructor() {
    super(
      'sleep',
      'Pauses this chat session for a specified number of seconds. The duration must be between 1 and 10 seconds.',
      inputSchema
    );
  }

  protected async handle(signal: AbortSignal, _context: ToolContext, arg: Input): Promise<ZodToolExecutionResult> {
    const ms = arg.seconds * 1000;
    await abortableSleep(signal, ms);
    return {
      content: {
        success: `Paused for ${arg.seconds} seconds`
      }
    };
  }
}
