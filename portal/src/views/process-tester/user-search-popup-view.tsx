import type { GetUsersResponse } from '@aila/model';
import { SvgIcon } from '../common/svg-icons';

export interface UserSearchPopupViewProps {
  search: string;
  result: GetUsersResponse | null;
  openedUserNames: string[];
  isLoading: boolean;
  error: string | null;
  onSearchChange(search: string): void;
  onOpenUser(userName: string): void;
  onClose(): void;
}

export function UserSearchPopupView(props: UserSearchPopupViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={props.onClose} aria-label="Close user search" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-user-chat-title"
        className="relative flex max-h-[min(36rem,calc(100vh-1.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:max-h-[min(36rem,calc(100vh-3rem))]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="open-user-chat-title" className="text-lg font-semibold text-slate-900">
              Open user chat
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Find a user to add to the test chat panel.</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close user search"
          >
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-200 p-4">
          <label htmlFor="user-chat-search" className="mb-1.5 block text-sm font-medium text-slate-700">
            Search users
          </label>
          <input
            id="user-chat-search"
            type="search"
            value={props.search}
            autoFocus
            onChange={event => props.onSearchChange(event.currentTarget.value)}
            placeholder="Enter a user name..."
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto p-2">
          {props.isLoading ? (
            <PopupMessage>Loading users...</PopupMessage>
          ) : props.error ? (
            <PopupMessage isError>Could not load users: {props.error}</PopupMessage>
          ) : !props.result || props.result.users.length === 0 ? (
            <PopupMessage>No users found.</PopupMessage>
          ) : (
            <>
              <ul className="space-y-1">
                {props.result.users.map(user => {
                  const isOpened = props.openedUserNames.includes(user.name);
                  return (
                    <li key={user.name}>
                      <button
                        type="button"
                        onClick={() => props.onOpenUser(user.name)}
                        className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">@{user.name}</span>
                          <span className="block text-xs text-slate-500">{user.isAdmin ? 'Admin' : 'User'}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-medium ${isOpened ? 'text-slate-400' : 'text-slate-700'}`}>
                          {isOpened ? 'Opened' : 'Open chat'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {props.result.totalCount > props.result.users.length && (
                <p className="px-3 py-2 text-center text-xs text-slate-500">Refine your search to see more users.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PopupMessage(props: { children: React.ReactNode; isError?: boolean }) {
  return (
    <div
      className={`flex min-h-44 items-center justify-center px-4 text-center text-sm ${props.isError ? 'text-red-700' : 'text-slate-500'}`}
    >
      {props.children}
    </div>
  );
}
