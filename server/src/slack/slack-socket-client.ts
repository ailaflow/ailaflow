import { SocketModeClient } from '@slack/socket-mode';
import { Logger } from '../core/logger';
import { formatSlackError } from './slack-error';

export interface SlackSocketEvent {
  type?: string;
  body: unknown;
  acknowledge(): Promise<void>;
}

export interface SlackSocketClient {
  start(
    appToken: string,
    onEvent: (event: SlackSocketEvent) => Promise<void>,
    signal: AbortSignal,
    onConnectionChange?: (connected: boolean, error: string | null) => void
  ): Promise<void>;
  stop(): Promise<void>;
}

export class OfficialSlackSocketClient implements SlackSocketClient {
  private readonly logger = new Logger(OfficialSlackSocketClient.name);
  private client: SocketModeClient | null = null;
  private stopPromise: Promise<void> | null = null;

  public async start(
    appToken: string,
    onEvent: (event: SlackSocketEvent) => Promise<void>,
    signal: AbortSignal,
    onConnectionChange?: (connected: boolean, error: string | null) => void
  ): Promise<void> {
    await this.stop();
    if (signal.aborted) {
      return;
    }
    const client = new SocketModeClient({ appToken });
    this.client = client;
    client.on('slack_event', args => {
      void onEvent({ type: args.type, body: args.body, acknowledge: args.ack }).catch(error => {
        this.logger.error(`Failed to handle Slack Socket Mode event: ${formatSlackError(error)}`);
      });
    });
    client.on('connected', () => onConnectionChange?.(true, null));
    client.on('reconnecting', () => onConnectionChange?.(false, 'Slack Socket Mode is reconnecting'));
    client.on('disconnected', () => onConnectionChange?.(false, 'Slack Socket Mode disconnected'));
    signal.addEventListener(
      'abort',
      () => {
        void this.stop().catch(error => {
          this.logger.error(`Failed to stop Slack Socket Mode client: ${formatSlackError(error)}`);
        });
      },
      { once: true }
    );
    await client.start();
  }

  public async stop(): Promise<void> {
    if (this.stopPromise) {
      await this.stopPromise;
      return;
    }
    const client = this.client;
    this.client = null;
    if (!client) {
      return;
    }
    const stopPromise = client.disconnect();
    this.stopPromise = stopPromise;
    try {
      await stopPromise;
    } finally {
      if (this.stopPromise === stopPromise) {
        this.stopPromise = null;
      }
    }
  }
}
