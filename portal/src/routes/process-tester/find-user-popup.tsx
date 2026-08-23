import type { GetUsersResponse } from '@aila/model';
import { useEffect, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { UserSearchPopupView } from '../../views/process-tester/user-search-popup-view';
import { useProcessTester } from './process-tester-context';

const USER_SEARCH_PAGE_SIZE = 50;
const USER_SEARCH_DEBOUNCE_MS = 300;

export interface FindUserPopupProps {
  onSelectUser(userName: string): void;
  onClose(): void;
}

export function FindUserPopup(props: FindUserPopupProps) {
  const apiClient = useApiClient();
  const state = useProcessTester();
  const [search, setSearch] = useState('');
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
        const response = await apiClient.user.getUsers(abortController.signal, {
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
  }, [apiClient, search]);

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
    <UserSearchPopupView
      search={search}
      result={result}
      openedUserNames={state.chatUserNames}
      isLoading={isLoading}
      error={error}
      onSearchChange={setSearch}
      onOpenUser={props.onSelectUser}
      onClose={props.onClose}
    />
  );
}
