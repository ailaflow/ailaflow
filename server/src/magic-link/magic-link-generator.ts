import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { MagicLink, MAGIC_LINK_VALIDITY_HOURS } from '../repositories/auth-token/magic-link';

export enum MagicLinkStatus {
  SUCCESS,
  NOT_CONFIGURED,
  FAILURE
}

export type MagicLinkResult =
  | {
      status: MagicLinkStatus.SUCCESS;
      url: string;
    }
  | {
      status: MagicLinkStatus.NOT_CONFIGURED | MagicLinkStatus.FAILURE;
    };

export class MagicLinkGenerator {
  public constructor(
    private readonly configurationManager: KvConfigurationManager,
    private readonly magicLinkRepository: MagicLinkRepository
  ) {}

  public getValidityHours(): number {
    return MAGIC_LINK_VALIDITY_HOURS;
  }

  public tryGenerateTaskForm(signal: AbortSignal, userName: string, taskId: string): Promise<MagicLinkResult> {
    return this.tryGenerate(signal, userName, `/my-tasks/${encodeURIComponent(taskId)}?fs=1`);
  }

  public tryGenerateProcessStartForm(signal: AbortSignal, userName: string, processName: string): Promise<MagicLinkResult> {
    return this.tryGenerate(signal, userName, `/my-processes/${encodeURIComponent(processName)}?fs=1`);
  }

  private async tryGenerate(signal: AbortSignal, userName: string, target: string): Promise<MagicLinkResult> {
    const configuration = await this.configurationManager.get(signal);
    if (!configuration.publicUrl) {
      return {
        status: MagicLinkStatus.NOT_CONFIGURED
      };
    }

    const magicLink = MagicLink.create(userName);
    if (!(await this.magicLinkRepository.tryInsert(signal, magicLink))) {
      return {
        status: MagicLinkStatus.FAILURE
      };
    }

    const url = new URL(`${configuration.publicUrl}/magic-link`);
    url.searchParams.set('t', target);
    url.hash = new URLSearchParams({ token: magicLink.token }).toString();
    return {
      status: MagicLinkStatus.SUCCESS,
      url: url.toString()
    };
  }
}
