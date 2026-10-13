import type { ChatMessageMetadata } from '@aibindkit/core';
import type { ProcessStartFormMessageMetadata, TaskFormMessageMetadata } from '@ailaflow/shared';
import type { MagicLinkGenerator, MagicLinkResult } from './magic-link-generator';

export interface FormLinkMessage {
  title: string;
  result: MagicLinkResult;
  validityHours: number;
}

export class FormLinkMessageGenerator {
  public constructor(private readonly magicLinkGenerator: MagicLinkGenerator) {}

  public async generate(signal: AbortSignal, userName: string, metadata: ChatMessageMetadata | undefined): Promise<FormLinkMessage[]> {
    const messages: FormLinkMessage[] = [];
    const taskId = metadata?.['taskId'] as string | undefined;
    if (typeof taskId === 'string') {
      const result = await this.magicLinkGenerator.tryGenerateTaskForm(signal, userName, taskId);
      messages.push({ title: 'Task Form', result, validityHours: this.magicLinkGenerator.getValidityHours() });
    }

    const processStartForm = metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
    if (typeof processStartForm?.name === 'string') {
      const result = await this.magicLinkGenerator.tryGenerateProcessStartForm(signal, userName, processStartForm.name);
      messages.push({ title: 'Start Form', result, validityHours: this.magicLinkGenerator.getValidityHours() });
    }
    return messages;
  }

  public hasMetadata(metadata: ChatMessageMetadata | undefined): boolean {
    const taskId = metadata?.['taskId'] as string | undefined;
    const processStartForm = metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
    return typeof taskId === 'string' || typeof processStartForm?.name === 'string';
  }
}
