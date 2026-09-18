import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { MagicLink, MAGIC_LINK_VALIDITY_HOURS } from '../repositories/auth-token/magic-link';

export class MagicLinkGenerator {
  public constructor(
    private readonly configurationManager: KvConfigurationManager,
    private readonly magicLinkRepository: MagicLinkRepository
  ) {}

  public getValidityHours(): number {
    return MAGIC_LINK_VALIDITY_HOURS;
  }

  public tryGenerateTaskForm(abortSignal: AbortSignal, userName: string, taskId: string): Promise<string | null> {
    return this.tryGenerate(abortSignal, userName, `/my-tasks/${encodeURIComponent(taskId)}`);
  }

  public tryGenerateProcessStartForm(abortSignal: AbortSignal, userName: string, processName: string): Promise<string | null> {
    return this.tryGenerate(abortSignal, userName, `/my-processes/${encodeURIComponent(processName)}/start`);
  }

  private async tryGenerate(abortSignal: AbortSignal, userName: string, target: string): Promise<string | null> {
    const configuration = await this.configurationManager.get(abortSignal);
    if (!configuration.publicUrl) {
      return null;
    }

    const magicLink = MagicLink.create(userName);
    await this.magicLinkRepository.insert(abortSignal, magicLink);

    const url = new URL(`${configuration.publicUrl}/magic-link`);
    url.searchParams.set('t', target);
    url.hash = new URLSearchParams({ token: magicLink.token }).toString();
    return url.toString();
  }
}
