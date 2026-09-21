import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';

export interface ProcessEditorDetailsViewProps {
  id: string;
  description: string;
  descriptionError: string | null;
  userAccessExpression: string;
  userAccessExpressionError: string | null;
  display: ProcessDisplay;
  executionMode: ProcessExecutionMode;
  onDescriptionChange(description: string): void;
  onUserAccessExpressionChange(userAccessExpression: string): void;
  onDisplayChange(display: ProcessDisplay): void;
  onExecutionModeChange(executionMode: ProcessExecutionMode): void;
}

export function ProcessEditorDetailsView(props: ProcessEditorDetailsViewProps) {
  const descriptionErrorId = `${props.id}-description-error`;
  const userAccessExpressionErrorId = `${props.id}-user-access-expression-error`;
  const descriptionLabelClassName = `flex h-8 w-full overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.descriptionError ? 'border-red-300 bg-red-50/30 focus-within:border-red-400' : 'border-slate-300 focus-within:border-slate-500'
  }`;
  const userAccessExpressionLabelClassName = `flex h-8 w-full overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.userAccessExpressionError
      ? 'border-red-300 bg-red-50/30 focus-within:border-red-400'
      : 'border-slate-300 focus-within:border-slate-500'
  }`;

  return (
    <div id={props.id} className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
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
          <div id={descriptionErrorId} className="px-1 pt-1 text-xs text-red-700">
            {props.descriptionError}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">User access</label>
        <label className={userAccessExpressionLabelClassName}>
          <input
            type="text"
            value={props.userAccessExpression}
            onChange={e => props.onUserAccessExpressionChange(e.target.value)}
            aria-invalid={props.userAccessExpressionError !== null}
            aria-describedby={props.userAccessExpressionError ? userAccessExpressionErrorId : undefined}
            className="h-full min-w-0 flex-1 px-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
            placeholder='User access, e.g. @alice or @{.department = "sales"}'
            title='User access expression, e.g. @alice or @{.department = "sales"}'
          />
        </label>
        {props.userAccessExpressionError && (
          <div id={userAccessExpressionErrorId} className="px-1 pt-1 text-xs text-red-700">
            {props.userAccessExpressionError}
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Display</span>
        <select
          value={props.display}
          onChange={e => props.onDisplayChange(Number(e.target.value) as ProcessDisplay)}
          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-500"
        >
          <option value={ProcessDisplay.FEATURED}>Featured</option>
          <option value={ProcessDisplay.LISTED}>Listed</option>
          <option value={ProcessDisplay.HIDDEN}>Hidden (not shown in UI or AI)</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Execution mode</span>
        <select
          value={props.executionMode}
          onChange={e => props.onExecutionModeChange(Number(e.target.value) as ProcessExecutionMode)}
          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-600 outline-none transition-colors focus:border-slate-500"
        >
          <option value={ProcessExecutionMode.AI_TOOL_OR_START_FORM}>AI using tools and start form</option>
          <option value={ProcessExecutionMode.START_FORM}>Start form only</option>
        </select>
      </label>
    </div>
  );
}
