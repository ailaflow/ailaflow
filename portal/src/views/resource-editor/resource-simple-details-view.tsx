export interface ResourceSimpleDetailsViewProps {
  id: string;
  description: string;
  descriptionError: string | null;
  onDescriptionChange(description: string): void;
}

export function ResourceSimpleDetailsView(props: ResourceSimpleDetailsViewProps) {
  const descriptionErrorId = `${props.id}-description-error`;
  const labelClassName = `flex h-8 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.descriptionError ? 'border-red-300 bg-red-50/30 focus-within:border-red-400' : 'border-transparent focus-within:border-slate-300'
  }`;

  return (
    <div id={props.id} className="pt-1">
      <label className={labelClassName}>
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
  );
}
