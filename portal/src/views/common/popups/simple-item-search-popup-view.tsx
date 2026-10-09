import { useId } from 'react';
import { PaginationView, type PaginationViewProps } from '../pagination-view';
import { SvgIcon } from '../svg-icons';
import { GenericPopupView } from './generic-popup-view';

export interface SimpleSearchItem {
  id: string;
  label: string;
  description?: string;
  actionLabel?: string;
  isActionMuted?: boolean;
}

export interface SimpleItemSearchPopupViewProps {
  title: string;
  description?: string;
  closeLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  loadingMessage: string;
  errorMessage: string;
  emptyMessage: string;
  resultHint?: string;
  search: string;
  items: SimpleSearchItem[];
  isLoading: boolean;
  error: string | null;
  pagination?: PaginationViewProps;
  multiSelection?: {
    items: SimpleSearchItem[];
    onConfirm(): void;
  };
  onSearchChange(search: string): void;
  onSelectItem(id: string): void;
  onClose(): void;
}

export function SimpleItemSearchPopupView(props: SimpleItemSearchPopupViewProps) {
  const searchId = useId();
  const selection = props.multiSelection;
  return (
    <GenericPopupView
      size="small"
      title={props.title}
      description={props.description}
      closeLabel={props.closeLabel}
      onClose={props.onClose}
    >
      <div className="shrink-0 border-b border-slate-200 p-4">
        <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {props.searchLabel}
        </label>
        <input
          id={searchId}
          type="search"
          value={props.search}
          autoFocus
          onChange={event => props.onSearchChange(event.currentTarget.value)}
          placeholder={props.searchPlaceholder}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
        />
        {selection && selection.items.length > 0 && (
          <ul aria-label="Selected items" className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
            {selection.items.map(item => (
              <li key={item.id} className="min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => props.onSelectItem(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="cursor-pointer inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                >
                  <span className="truncate">{item.label}</span>
                  <SvgIcon name="x" className="h-3 w-3 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={props.isLoading}>
        {props.isLoading ? (
          <p role="status" className="px-4 py-12 text-center text-sm text-slate-500">
            {props.loadingMessage}
          </p>
        ) : props.error ? (
          <p role="alert" className="px-4 py-12 text-center text-sm text-red-700">
            {props.errorMessage}: {props.error}
          </p>
        ) : props.items.length === 0 ? (
          <p role="status" className="px-4 py-12 text-center text-sm text-slate-500">
            {props.emptyMessage}
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {props.items.map(item => (
                <li key={item.id}>
                  {selection ? (
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={selection.items.some(selected => selected.id === item.id)}
                        onChange={() => props.onSelectItem(item.id)}
                        aria-label={`Select ${item.label}`}
                        className="h-4 w-4 shrink-0 accent-slate-800"
                      />
                      <ItemDetails item={item} />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onSelectItem(item.id)}
                      className="cursor-pointer flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                    >
                      <ItemDetails item={item} />
                      {item.actionLabel && (
                        <span className={`shrink-0 text-xs font-medium ${item.isActionMuted ? 'text-slate-400' : 'text-slate-700'}`}>
                          {item.actionLabel}
                        </span>
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {props.resultHint && <p className="px-3 py-2 text-center text-xs text-slate-500">{props.resultHint}</p>}
          </>
        )}
      </div>

      {!props.isLoading && !props.error && props.pagination && (
        <div className="shrink-0">
          <PaginationView {...props.pagination} />
        </div>
      )}
      {selection && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <span className="text-sm text-slate-500">{selection.items.length} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={selection.onConfirm}
              className="cursor-pointer rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Confirm selection
            </button>
          </div>
        </div>
      )}
    </GenericPopupView>
  );
}

function ItemDetails(props: { item: SimpleSearchItem }) {
  return (
    <span className="min-w-0">
      <span className="block break-words text-sm font-medium text-slate-800">{props.item.label}</span>
      {props.item.description && <span className="block break-words text-xs text-slate-500">{props.item.description}</span>}
    </span>
  );
}
