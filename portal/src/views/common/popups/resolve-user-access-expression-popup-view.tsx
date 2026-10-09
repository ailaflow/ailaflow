import { GenericPopupView } from './generic-popup-view';

export interface ResolveUserAccessExpressionPopupViewProps {
  expression: string;
  userNames: string[];
  isLoading: boolean;
  error: string | null;
  onClose(): void;
}

export function ResolveUserAccessExpressionPopupView(props: ResolveUserAccessExpressionPopupViewProps) {
  const description = props.expression.trim() || 'Empty expression (all users)';

  return (
    <GenericPopupView
      size="small"
      title="Resolved users"
      description={description}
      closeLabel="Close resolved users"
      onClose={props.onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={props.isLoading}>
        {props.isLoading ? (
          <p role="status" className="px-4 py-12 text-center text-sm text-slate-500">
            Resolving user access expression...
          </p>
        ) : props.error ? (
          <p role="alert" className="px-4 py-12 text-center text-sm text-red-700">
            Could not resolve user access expression: {props.error}
          </p>
        ) : props.userNames.length === 0 ? (
          <p role="status" className="px-4 py-12 text-center text-sm text-slate-500">
            This expression does not resolve to any users.
          </p>
        ) : (
          <div>
            <p className="px-3 pb-2 text-xs text-slate-500">
              {props.userNames.length} {props.userNames.length === 1 ? 'user' : 'users'}
            </p>
            <ul aria-label="Resolved users" className="space-y-1">
              {props.userNames.map(userName => (
                <li key={userName} className="rounded-md bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                  @{userName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </GenericPopupView>
  );
}
