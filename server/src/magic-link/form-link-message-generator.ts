import { ChatMessageMetadata } from '@aibindkit/core';
import { ProcessStartFormMessageMetadata, TaskFormMessageMetadata } from '@ailaflow/shared';
import { MagicLinkGenerator, MagicLinkResult, MagicLinkStatus } from './magic-link-generator';

export class FormLinkMessageGenerator {
  public constructor(private readonly magicLinkGenerator: MagicLinkGenerator) {}

  public async tryAppend(
    targetMessages: string[],
    signal: AbortSignal,
    userName: string,
    metadata: ChatMessageMetadata | undefined
  ): Promise<boolean> {
    let appended = false;
    const taskForm = metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
    if (typeof taskForm?.id === 'string') {
      const result = await this.magicLinkGenerator.tryGenerateTaskForm(signal, userName, taskForm.id);
      targetMessages.push(this.format('Task Form', result));
      appended = true;
    }

    const processStartForm = metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
    if (typeof processStartForm?.name === 'string') {
      const result = await this.magicLinkGenerator.tryGenerateProcessStartForm(signal, userName, processStartForm.name);
      targetMessages.push(this.format('Start Form', result));
      appended = true;
    }
    return appended;
  }

  public hasMetadata(metadata: ChatMessageMetadata | undefined): boolean {
    const taskForm = metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
    const processStartForm = metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
    return typeof taskForm?.id === 'string' || typeof processStartForm?.name === 'string';
  }

  private format(title: string, result: MagicLinkResult): string {
    let content: string;
    switch (result.status) {
      case MagicLinkStatus.SUCCESS: {
        content = `Please click here: ${result.url}\nValid for ${this.magicLinkGenerator.getValidityHours()} hours.`;
        break;
      }
      case MagicLinkStatus.NOT_CONFIGURED: {
        content = 'The public URL is not configured. Please notify your administrator.';
        break;
      }
      case MagicLinkStatus.FAILURE: {
        content = 'Form link generation failed.';
        break;
      }
    }
    return `─── 💼 ${title} ────\n${content}\n──────────────\n`;
  }
}
