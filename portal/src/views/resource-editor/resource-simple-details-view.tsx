export interface ResourceSimpleDetailsViewProps {
  id: string;
  description: string;
  descriptionError: string | null;
  userAccessExpression?: string;
  userAccessExpressionError?: string | null;
  onDescriptionChange(description: string): void;
  onUserAccessExpressionChange?(userAccessExpression: string): void;
}

export function ResourceSimpleDetailsView(props: ResourceSimpleDetailsViewProps) {
  const descriptionErrorId = `${props.id}-description-error`;
  const userAccessExpressionErrorId = `${props.id}-user-access-expression-error`;
  const descriptionLabelClassName = `flex h-8 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.descriptionError ? 'border-red-300 bg-red-50/30 focus-within:border-red-400' : 'border-slate-300 focus-within:border-slate-500'
  }`;
  const userAccessExpressionLabelClassName = `flex h-8 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.userAccessExpressionError
      ? 'border-red-300 bg-red-50/30 focus-within:border-red-400'
      : 'border-slate-300 focus-within:border-slate-500'
  }`;
  const isUserAccessExpressionVisible = props.onUserAccessExpressionChange !== undefined;

  return (
    <div id={props.id} className="space-y-3 pt-1">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
        <label className={descriptionLabelClassName}>
          <input
            type="text"
            value={props.description}
            onChange={e => props.onDescriptionChange(e.target.value)}
            aria-invalid={props.descriptionError !== null}
            aria-describedby={props.descriptionError ? descriptionErrorId : undefined}
            className="h-full min-w-0 flex-1 px-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
            placeholder="Description"
          />
        </label>
        {props.descriptionError && (
          <div id={descriptionErrorId} className="max-w-md px-1 pt-1 text-xs text-red-700">
            {props.descriptionError}
          </div>
        )}
      </div>

      {isUserAccessExpressionVisible && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">User access</label>
          <label className={userAccessExpressionLabelClassName}>
            <input
              type="text"
              value={props.userAccessExpression ?? ''}
              onChange={e => props.onUserAccessExpressionChange?.(e.target.value)}
              aria-invalid={props.userAccessExpressionError !== null && props.userAccessExpressionError !== undefined}
              aria-describedby={props.userAccessExpressionError ? userAccessExpressionErrorId : undefined}
              className="h-full min-w-0 flex-1 px-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
              placeholder='User access, e.g. @alice or @{.department = "sales"}'
              title='User access expression, e.g. @alice or @{.department = "sales"}'
            />
          </label>
          {props.userAccessExpressionError && (
            <div id={userAccessExpressionErrorId} className="max-w-md px-1 pt-1 text-xs text-red-700">
              {props.userAccessExpressionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
