import type { MyChannelDto } from '@ailaflow/shared';
import { SvgIcon } from '../common/svg-icons';

export interface MyChannelsViewProps {
  channels: MyChannelDto[];
  nameErrors: Array<string | null>;
  nameReadOnly: boolean[];
  canSave: boolean[];
  canReset: boolean[];
  canRemove: boolean[];
  saving: boolean[];
  errors: Array<string | null>;
  successes: boolean[];
  canAdd: boolean;
  onAdd(): void;
  onChange(index: number, delta: Partial<MyChannelDto>): void;
  onSetDefault(index: number): void;
  onReset(index: number): void;
  onSave(index: number): void | Promise<void>;
  onRemove(index: number): void | Promise<void>;
}

export function MyChannelsView(props: MyChannelsViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <section className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">My channels</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create chat channels with custom instructions and choose the channel used by default.
            </p>
          </div>
          <button
            type="button"
            disabled={!props.canAdd}
            onClick={props.onAdd}
            className="cursor-pointer inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <SvgIcon name="plus" className="h-4 w-4" />
            Add channel
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {props.channels.map((channel, index) => (
            <article key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <label className="block text-sm font-medium text-slate-700">
                  Channel name
                  <input
                    type="text"
                    value={channel.name}
                    disabled={props.saving[index]}
                    readOnly={props.nameReadOnly[index]}
                    aria-invalid={props.nameErrors[index] !== null}
                    onChange={event => props.onChange(index, { name: event.target.value })}
                    className={`mt-1.5 h-9 w-full rounded-md border px-3 font-normal text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-100 read-only:cursor-default read-only:bg-slate-100 ${
                      props.nameErrors[index] ? 'border-red-300' : 'border-slate-300'
                    }`}
                  />
                  {props.nameErrors[index] ? <span className="mt-1 block font-normal text-red-700">{props.nameErrors[index]}</span> : null}
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 md:pt-9">
                  <input
                    type="radio"
                    name="default-channel"
                    checked={channel.isDefault}
                    disabled={props.saving[index]}
                    onChange={() => props.onSetDefault(index)}
                    className="h-4 w-4 accent-slate-900"
                  />
                  Default
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Custom instructions
                <textarea
                  rows={5}
                  value={channel.prompt}
                  disabled={props.saving[index]}
                  onChange={event => props.onChange(index, { prompt: event.target.value })}
                  placeholder="Optional instructions added to this channel's assistant prompt"
                  className="mt-1.5 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-normal leading-6 text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-100"
                />
              </label>

              {props.errors[index] ? (
                <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {props.errors[index]}
                </p>
              ) : null}
              {props.successes[index] ? (
                <p role="status" className="mt-3 text-sm text-emerald-700">
                  Channel saved.
                </p>
              ) : null}

              <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={!props.canRemove[index]}
                  onClick={() => void props.onRemove(index)}
                  className="cursor-pointer h-9 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                >
                  Delete
                </button>
                <button
                  type="button"
                  disabled={!props.canReset[index] || props.saving[index]}
                  onClick={() => props.onReset(index)}
                  className="cursor-pointer h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {props.nameReadOnly[index] ? 'Reset' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={!props.canSave[index]}
                  onClick={() => void props.onSave(index)}
                  className="cursor-pointer h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {props.saving[index] ? 'Saving…' : 'Save'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
