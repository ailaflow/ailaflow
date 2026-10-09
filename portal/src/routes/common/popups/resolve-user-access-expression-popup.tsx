import { useEffect, useState } from 'react';
import { ApiClient } from '../../../api/api-client';
import { ResolveUserAccessExpressionPopupView } from '../../../views/common/popups/resolve-user-access-expression-popup-view';

export interface ResolveUserAccessExpressionPopupProps {
  apiClient: ApiClient;
  expression: string;
  onClose(): void;
}

export function ResolveUserAccessExpressionPopup(props: ResolveUserAccessExpressionPopupProps) {
  const [userNames, setUserNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setUserNames([]);
    setIsLoading(true);
    setError(null);

    async function resolveExpression(): Promise<void> {
      try {
        const response = await props.apiClient.user.resolveUserAccessExpression(abortController.signal, {
          expression: props.expression
        });
        if (!abortController.signal.aborted) {
          setUserNames(response.userNames);
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
    }

    void resolveExpression();
    return () => abortController.abort();
  }, [props.apiClient, props.expression]);

  return (
    <ResolveUserAccessExpressionPopupView
      expression={props.expression}
      userNames={userNames}
      isLoading={isLoading}
      error={error}
      onClose={props.onClose}
    />
  );
}
