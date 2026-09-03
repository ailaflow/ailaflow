import { LlmProviderPolicy, LlmProviderType } from '@aila/model';
import type { LlmModelDto, LlmProviderDto, LlmUseCase } from '@aila/model';
import { useState } from 'react';

export interface LlmProviderDraft {
  id: string;
  insert: boolean;
  name: string;
  type: LlmProviderType;
  url: string;
  apiKey: string;
  hasApiKey: boolean;
  models: LlmModelDto[];
}

export interface LlmUseCaseDraft {
  useCase: LlmUseCase;
  label: string;
  providerId: string;
  modelName: string;
  modelContextWindow: string;
  effectiveContextWindowPercent: string;
}

export interface LlmConfigurationViewProps {
  providers: LlmProviderDto[];
  useCases: LlmUseCaseDraft[];
  providerDraft: LlmProviderDraft | null;
  canFetchProviderModels: boolean;
  canSaveProvider: boolean;
  canSaveUseCases: boolean;
  isSavingProvider: boolean;
  isFetchingProviderModels: boolean;
  isSavingUseCases: boolean;
  onProviderAdd(): void;
  onProviderEdit(provider: LlmProviderDto): void;
  onProviderDelete(provider: LlmProviderDto): void | Promise<void>;
  onProviderDraftChange(delta: Partial<LlmProviderDraft>): void;
  onProviderModelsFetch(): void | Promise<void>;
  onProviderEditCancel(): void;
  onProviderSave(): void | Promise<void>;
  onUseCaseChange(
    useCase: LlmUseCaseDraft['useCase'],
    delta: Partial<Pick<LlmUseCaseDraft, 'providerId' | 'modelName' | 'modelContextWindow' | 'effectiveContextWindowPercent'>>
  ): void;
  onUseCasesSave(): void | Promise<void>;
}

const providerTypeLabels: Record<LlmProviderType, string> = {
  [LlmProviderType.OPENAI]: 'OpenAI',
  [LlmProviderType.ANTHROPIC]: 'Anthropic',
  [LlmProviderType.OPENAI_COMPATIBLE]: 'OpenAI compatible',
  [LlmProviderType.CODEX_APP_SERVER]: 'Codex app-server'
};

export function LlmConfigurationView(props: LlmConfigurationViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Use cases</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the provider and model used by each part of Aila.</p>
            </div>
            <button
              type="button"
              disabled={!props.canSaveUseCases}
              onClick={() => void props.onUseCasesSave()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            >
              {props.isSavingUseCases ? 'Saving…' : 'Save use cases'}
            </button>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {props.useCases.map(useCase => (
              <UseCaseEditor key={useCase.useCase} useCase={useCase} providers={props.providers} onChange={props.onUseCaseChange} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Providers</h2>
              <p className="mt-1 text-sm text-slate-500">Credentials are stored by the server and are never returned to the browser.</p>
            </div>
            <button
              type="button"
              onClick={props.onProviderAdd}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add provider
            </button>
          </div>

          {props.providerDraft && (
            <ProviderEditor
              draft={props.providerDraft}
              canFetchModels={props.canFetchProviderModels}
              canSave={props.canSaveProvider}
              isFetchingModels={props.isFetchingProviderModels}
              isSaving={props.isSavingProvider}
              onChange={props.onProviderDraftChange}
              onCancel={props.onProviderEditCancel}
              onFetchModels={props.onProviderModelsFetch}
              onSave={props.onProviderSave}
            />
          )}

          <div className="overflow-x-auto">
            <table className="min-w-180 w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <tr>
                  <th className="w-[28%] px-4 py-3 font-semibold">Name</th>
                  <th className="w-[22%] px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Endpoint</th>
                  <th className="w-24 px-4 py-3 text-right font-semibold">Models</th>
                  <th className="w-44 px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {props.providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No LLM providers configured.
                    </td>
                  </tr>
                ) : (
                  props.providers.map(provider => (
                    <tr key={provider.id} className="hover:bg-slate-50">
                      <td className="truncate px-4 py-3 font-medium text-slate-900">{provider.name}</td>
                      <td className="px-4 py-3 text-slate-600">{providerTypeLabels[provider.type]}</td>
                      <td className="truncate px-4 py-3 font-mono text-xs text-slate-600">{provider.url ?? 'Default endpoint'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{provider.models.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <ActionButton onClick={() => props.onProviderEdit(provider)}>Edit</ActionButton>
                          <ActionButton danger onClick={() => void props.onProviderDelete(provider)}>
                            Delete
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

function UseCaseEditor(props: {
  useCase: LlmUseCaseDraft;
  providers: LlmProviderDto[];
  onChange(
    useCase: LlmUseCaseDraft['useCase'],
    delta: Partial<Pick<LlmUseCaseDraft, 'providerId' | 'modelName' | 'modelContextWindow' | 'effectiveContextWindowPercent'>>
  ): void;
}) {
  const provider = props.providers.find(item => item.id === props.useCase.providerId);
  const hasUnavailableSelection = Boolean(
    props.useCase.modelName && !provider?.models.some(model => model.name === props.useCase.modelName)
  );

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h3 className="font-medium text-slate-900">{props.useCase.label}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Provider
          <select
            value={props.useCase.providerId}
            onChange={event =>
              props.onChange(props.useCase.useCase, { providerId: event.target.value, modelName: '', modelContextWindow: '' })
            }
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-normal text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="">Not configured</option>
            {props.providers.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Model
          <select
            disabled={!provider}
            value={props.useCase.modelName}
            onChange={event => {
              const modelName = event.target.value;
              const model = provider?.models.find(item => item.name === modelName);
              props.onChange(props.useCase.useCase, {
                modelName,
                modelContextWindow: model?.contextWindow?.toString() ?? ''
              });
            }}
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-sm font-normal text-slate-900 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {provider ? (provider.models.length > 0 ? 'Select model' : 'No models fetched') : 'Select provider first'}
            </option>
            {hasUnavailableSelection && <option value={props.useCase.modelName}>{props.useCase.modelName} (unavailable)</option>}
            {provider?.models.map(model => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Context window
          <input
            type="number"
            min="1"
            step="1"
            value={props.useCase.modelContextWindow}
            onChange={event => props.onChange(props.useCase.useCase, { modelContextWindow: event.target.value })}
            placeholder="Unknown"
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Effective context window (%)
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={props.useCase.effectiveContextWindowPercent}
            onChange={event => props.onChange(props.useCase.useCase, { effectiveContextWindowPercent: event.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-sm font-normal text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
      </div>
    </div>
  );
}

function ProviderEditor(props: {
  draft: LlmProviderDraft;
  canFetchModels: boolean;
  canSave: boolean;
  isFetchingModels: boolean;
  isSaving: boolean;
  onChange(delta: Partial<LlmProviderDraft>): void;
  onCancel(): void;
  onFetchModels(): void | Promise<void>;
  onSave(): void | Promise<void>;
}) {
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const usesWebSocket = LlmProviderPolicy.supportsUrlProtocol(props.draft.type, 'ws:');
  return (
    <div className="border-b border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Name
          <input
            value={props.draft.name}
            onChange={event => props.onChange({ name: event.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-normal outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Provider type
          <select
            value={props.draft.type}
            onChange={event =>
              props.onChange({ type: Number(event.target.value) as LlmProviderType, apiKey: '', hasApiKey: false, models: [] })
            }
            className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-normal outline-none focus:border-slate-400"
          >
            {Object.entries(providerTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {LlmProviderPolicy.requiresUrl(props.draft.type) && (
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            {usesWebSocket ? 'WebSocket URL' : 'URL'}
            <input
              type="text"
              value={props.draft.url}
              onChange={event => props.onChange({ url: event.target.value, hasApiKey: false, models: [] })}
              placeholder={LlmProviderPolicy.getUrlExample(props.draft.type)}
              className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-sm font-normal outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
        )}
        {LlmProviderPolicy.requiresApiKey(props.draft.type) && (
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            API key
            <div className="mt-1.5 flex h-9 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-slate-400">
              <input
                type={isKeyVisible ? 'text' : 'password'}
                value={props.draft.apiKey}
                onChange={event => props.onChange({ apiKey: event.target.value, models: [] })}
                placeholder={props.draft.hasApiKey ? 'Leave empty to keep the configured key' : 'API key'}
                className="min-w-0 flex-1 px-2.5 font-mono text-sm font-normal outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible(value => !value)}
                className="border-l border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {isKeyVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {props.draft.models.length === 0
            ? 'No models fetched.'
            : `${props.draft.models.length} model${props.draft.models.length === 1 ? '' : 's'} fetched.`}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={!props.canFetchModels}
            onClick={() => void props.onFetchModels()}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {props.isFetchingModels ? 'Fetching…' : props.draft.models.length > 0 ? 'Refresh models' : 'Fetch models'}
          </button>
          <ActionButton onClick={props.onCancel}>Cancel</ActionButton>
          <button
            type="button"
            disabled={!props.canSave}
            onClick={() => void props.onSave()}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            {props.isSaving ? 'Saving…' : 'Save provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton(props: { danger?: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex h-8 items-center justify-center rounded-md border bg-white px-3 text-sm font-medium transition-colors ${
        props.danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {props.children}
    </button>
  );
}
