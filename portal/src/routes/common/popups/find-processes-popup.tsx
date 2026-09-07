import type { GetProcessesResponse } from '@aila/model';
import { useEffect, useState } from 'react';
import { SimpleItemSearchPopupView } from '../../../views/common/popups/simple-item-search-popup-view';
import { ApiClient } from '../../../api/api-client';

const PROCESS_SEARCH_PAGE_SIZE = 20;
const PROCESS_SEARCH_DEBOUNCE_MS = 300;

export interface FindProcessesPopupProps {
  apiClient: ApiClient;
  processNames: string[];
  onSelectProcesses(processNames: string[]): void;
  onClose(): void;
}

export function FindProcessesPopup(props: FindProcessesPopupProps) {
  const [selectedProcessNames, setSelectedProcessNames] = useState(() => [...new Set(props.processNames)]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<GetProcessesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setIsLoading(true);
    setError(null);
    setResult(null);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await props.apiClient.process.getProcesses(abortController.signal, {
          page,
          pageSize: PROCESS_SEARCH_PAGE_SIZE,
          search: search.trim() || undefined
        });
        if (!abortController.signal.aborted) {
          setResult(response);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, PROCESS_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [props.apiClient, page, search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.onClose]);

  function changeSearch(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function toggleProcess(name: string): void {
    setSelectedProcessNames(current => {
      if (current.includes(name)) {
        return current.filter(processName => processName !== name);
      }
      return [...current, name];
    });
  }

  return (
    <SimpleItemSearchPopupView
      title="Select processes"
      closeLabel="Close process search"
      searchLabel="Search processes"
      searchPlaceholder="Enter a process name..."
      loadingMessage="Loading processes..."
      errorMessage="Could not load processes"
      emptyMessage="No processes found."
      search={search}
      items={
        result?.processes.map(process => ({
          id: process.name,
          label: `/${process.name}`,
          description: process.description
        })) ?? []
      }
      multiSelection={{
        items: selectedProcessNames.map(name => ({ id: name, label: `/${name}` })),
        onConfirm: () => props.onSelectProcesses([...selectedProcessNames])
      }}
      isLoading={isLoading}
      error={error}
      onSearchChange={changeSearch}
      pagination={
        result
          ? {
              page: result.page,
              pageSize: result.pageSize,
              totalCount: result.totalCount,
              onPageChange: setPage
            }
          : undefined
      }
      onSelectItem={toggleProcess}
      onClose={props.onClose}
    />
  );
}
