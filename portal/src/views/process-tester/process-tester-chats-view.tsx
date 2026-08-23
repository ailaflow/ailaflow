import { SvgIcon } from '../common/svg-icons';

export interface ProcessTesterChatsViewProps {
  children: React.ReactNode;
  userNames: string[];
  currentUserName: string;
  activeUserName: string;
  onOpenUserChat(): void;
  onSelectUser(userName: string): void;
  onCloseUser(userName: string): void;
}

export function ProcessTesterChatsView(props: ProcessTesterChatsViewProps) {
  return (
    <section className="min-h-0 overflow-hidden border-t border-slate-300" aria-label="Test chats">
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        <div className="flex h-10 shrink-0 items-end overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-slate-100 px-2">
          <div className="flex h-full shrink-0 items-end" role="tablist" aria-label="Open test chats">
            {props.userNames.map(userName => {
              const isActive = userName === props.activeUserName;
              const isCurrentUser = userName === props.currentUserName;
              return (
                <div
                  key={userName}
                  className={`mb-[-1px] flex h-9 shrink-0 items-center rounded-t-md border border-b-0 ${
                    isActive
                      ? 'border-slate-200 bg-white text-slate-900'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => props.onSelectUser(userName)}
                    className="h-full max-w-48 truncate px-3 text-left text-sm font-medium"
                    title={`Open chat for ${userName}`}
                  >
                    @{userName}
                    {isCurrentUser && <span className="ml-1 text-xs font-normal text-slate-400">(you)</span>}
                  </button>
                  {!isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => props.onCloseUser(userName)}
                      className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                      aria-label={`Close chat for ${userName}`}
                      title={`Close chat for ${userName}`}
                    >
                      <SvgIcon name="x" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={props.onOpenUserChat}
            className="mb-1 ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Add chat"
            title="Open user chat"
          >
            <SvgIcon name="plus" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 bg-white">{props.children}</div>
      </div>
    </section>
  );
}
