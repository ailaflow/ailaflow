export interface JsonFormViewProps {
  variableNames: string[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onValueChanged: (name: string, value: string) => void;
  onSubmit: () => void;
}

export function JsonFormView(props: JsonFormViewProps) {
  const hasErrors = Object.keys(props.errors).length > 0;

  return (
    <form
      className="h-full w-full overflow-y-auto bg-white p-5"
      onSubmit={event => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {props.variableNames.map((name, index) => {
          const errorId = `json-form-variable-${index}-error`;
          const error = props.errors[name];

          return (
            <label key={name} className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">${name}</span>
              <textarea
                value={props.values[name] ?? ''}
                onChange={event => props.onValueChanged(name, event.currentTarget.value)}
                rows={4}
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                placeholder="Enter JSON..."
                className={`w-full resize-y rounded-md border bg-white px-3 py-2 font-mono text-sm leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
                  error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                }`}
              />
              {error && (
                <span id={errorId} className="mt-1 block text-xs text-red-700">
                  {error}
                </span>
              )}
            </label>
          );
        })}

        <div className="flex justify-center pt-1">
          <button
            type="submit"
            disabled={hasErrors}
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Submit
          </button>
        </div>
      </div>
    </form>
  );
}
