import type { GetUsersResponse } from '@ailaflow/shared';
import { useEffect, useState } from 'react';
import { SimpleItemSearchPopupView } from '../../../views/common/popups/simple-item-search-popup-view';
import { ApiClient } from '../../../api/api-client';

const USER_SEARCH_PAGE_SIZE = 50;
const USER_SEARCH_DEBOUNCE_MS = 300;

export interface FindUserPopupProps {
  apiClient: ApiClient;
  disabledUserNames: string[];
  initialSearch?: string;
  title: string;
  description: string;
  onSelectUser(userName: string): void;
  onClose(): void;
}

export function FindUserPopup(props: FindUserPopupProps) {
  const [search, setSearch] = useState(props.initialSearch ?? '');
  const [result, setResult] = useState<GetUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setIsLoading(true);
    setError(null);
    setResult(null);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await props.apiClient.user.getUsers(abortController.signal, {
          page: 1,
          pageSize: USER_SEARCH_PAGE_SIZE,
          search: search.trim() || undefined
        });
        setResult(response);
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError((e as Error)?.message ?? String(e));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, USER_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [props.apiClient, search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.onClose]);

  return (
    <SimpleItemSearchPopupView
      title={props.title}
      description={props.description}
      closeLabel="Close user search"
      searchLabel="Search users"
      searchPlaceholder="Enter a user name..."
      loadingMessage="Loading users..."
      errorMessage="Could not load users"
      emptyMessage="No users found."
      search={search}
      items={
        result?.users.map(user => ({
          id: user.name,
          label: `@${user.name}`,
          description: user.isAdmin ? 'Admin' : 'User',
          actionLabel: props.disabledUserNames.includes(user.name) ? 'Selected' : 'Select',
          isActionMuted: props.disabledUserNames.includes(user.name)
        })) ?? []
      }
      resultHint={result && result.totalCount > result.users.length ? 'Refine your search to see more users.' : undefined}
      isLoading={isLoading}
      error={error}
      onSearchChange={setSearch}
      onSelectItem={userName => {
        if (!props.disabledUserNames.includes(userName)) {
          props.onSelectUser(userName);
        }
      }}
      onClose={props.onClose}
    />
  );
}
