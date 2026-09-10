import type { TelegramBotConfigurationDto } from '@ailaflow/shared';
import { useState } from 'react';
import { SvgIcon } from './svg-icons';

export interface TelegramBotDraft {
  channelName: string;
  botToken: string;
  hasBotToken: boolean;
}

export interface TelegramConfigurationViewProps {
  bots: TelegramBotConfigurationDto[];
  availableChannels: string[];
  draft: TelegramBotDraft | null;
  canAdd: boolean;
  canSave: boolean;
  onAdd(): void;
  onEdit(bot: TelegramBotConfigurationDto): void;
  onDelete(bot: TelegramBotConfigurationDto): void | Promise<void>;
  onReconnect(bot: TelegramBotConfigurationDto): void | Promise<void>;
  onDraftChange(delta: Partial<TelegramBotDraft>): void;
  onEditCancel(): void;
  onSave(): void | Promise<void>;
}

export function TelegramConfigurationView(props: TelegramConfigurationViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Telegram bots</h2>
              <p className="mt-1 text-sm text-slate-500">
                Bind a Telegram bot to an AilaFlow chat channel. Bot tokens are stored by the server and are never returned to the browser.
              </p>
            </div>
            <button
              type="button"
              disabled={!props.canAdd}
              onClick={props.onAdd}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            >
              Add bot
            </button>
          </div>

          {props.draft && (
            <TelegramBotEditor
              draft={props.draft}
              availableChannels={props.availableChannels}
              canSave={props.canSave}
              onChange={props.onDraftChange}
              onCancel={props.onEditCancel}
              onSave={props.onSave}
            />
          )}

          <div className="overflow-x-auto">
            <table className="min-w-140 w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="w-48 px-4 py-3 font-semibold">Bot</th>
                  <th className="w-48 px-4 py-3 font-semibold">Connection</th>
                  <th className="w-60 px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {props.bots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No Telegram bots configured.
                    </td>
                  </tr>
                ) : (
                  props.bots.map(bot => (
                    <tr key={bot.channelName} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{bot.channelName}</td>
                      <td className="px-4 py-3 text-slate-600">{bot.botUserName ? `@${bot.botUserName}` : 'Configured'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {bot.isConnected ? (
                          'Connected'
                        ) : bot.botUserName && bot.linkCode ? (
                          <div className="flex flex-col items-start gap-1">
                            <a
                              href={`https://t.me/${bot.botUserName}?start=${bot.linkCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-blue-700 hover:underline"
                            >
                              Connect Telegram
                            </a>
                            <span className="font-mono text-xs text-slate-500">Code: {bot.linkCode}</span>
                          </div>
                        ) : (
                          'Waiting for configuration'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {bot.isConnected && <ActionButton onClick={() => void props.onReconnect(bot)}>Reconnect</ActionButton>}
                          <ActionButton ariaLabel={`Edit Telegram bot for channel ${bot.channelName}`} onClick={() => props.onEdit(bot)}>
                            <SvgIcon name="pencil" className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            danger
                            ariaLabel={`Delete Telegram bot for channel ${bot.channelName}`}
                            onClick={() => void props.onDelete(bot)}
                          >
                            <SvgIcon name="x" className="h-4 w-4" />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function TelegramBotEditor(props: {
  draft: TelegramBotDraft;
  availableChannels: string[];
  canSave: boolean;
  onChange(delta: Partial<TelegramBotDraft>): void;
  onCancel(): void;
  onSave(): void | Promise<void>;
}) {
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  return (
    <div className="border-b border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Channel
          <select
            value={props.draft.channelName}
            disabled={props.draft.hasBotToken}
            onChange={event => props.onChange({ channelName: event.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-normal text-slate-900 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {props.availableChannels.map(channel => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Bot token
          <div className="mt-1.5 flex h-9 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-slate-400">
            <input
              type={isTokenVisible ? 'text' : 'password'}
              value={props.draft.botToken}
              onChange={event => props.onChange({ botToken: event.target.value })}
              placeholder={props.draft.hasBotToken ? 'Leave empty to keep the configured token' : 'Bot token from BotFather'}
              autoComplete="off"
              className="min-w-0 flex-1 px-2.5 font-mono text-sm font-normal outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setIsTokenVisible(value => !value)}
              className="border-l border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {isTokenVisible ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <ActionButton onClick={props.onCancel}>Cancel</ActionButton>
        <button
          type="button"
          disabled={!props.canSave}
          onClick={() => void props.onSave()}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
        >
          Save bot
        </button>
      </div>
    </div>
  );
}

function ActionButton(props: { danger?: boolean; ariaLabel?: string; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      className={`inline-flex h-8 items-center justify-center rounded-md border bg-white px-3 text-sm font-medium transition-colors ${
        props.danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {props.children}
    </button>
  );
}
