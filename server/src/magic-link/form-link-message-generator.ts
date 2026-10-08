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
    const taskForm = metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
    if (typeof taskForm?.id === 'string') {
      const result = await this.magicLinkGenerator.tryGenerateTaskForm(signal, userName, taskForm.id);
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
    const taskForm = metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
    const processStartForm = metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
    return typeof taskForm?.id === 'string' || typeof processStartForm?.name === 'string';
  }
}
