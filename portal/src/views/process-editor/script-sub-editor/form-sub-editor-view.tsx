import type { FormDefinition, FormInputVariable, FormOutputVariable } from '@aila/model';
import { XIcon } from '../../common/svg-icons';
import { FormRenderer } from '../../form-renderer/form-renderer';

export const formEditorTabs = ['Input & Output', 'HTML', 'CSS', 'JS', 'Preview'] as const;
export type FormEditorTab = (typeof formEditorTabs)[number];

export interface FormSubEditorViewProps {
  selectedTab: FormEditorTab;
  availableVariables: string[];
  inputVariables: FormInputVariable[];
  outputVariables: FormOutputVariable[];
  errors: Record<string, string>;
  form: FormDefinition;
  onSelectTab: (tab: FormEditorTab) => void;
  onAddInput: (name: string) => void;
  onSetInputTestValue: (index: number, testValue: string) => void;
  onRemoveInput: (index: number) => void;
  onAddOutput: (name: string) => void;
  onRemoveOutput: (index: number) => void;
  onHtmlChange: (value: string) => void;
  onCssChange: (value: string) => void;
  onJsChange: (value: string) => void;
}

export function FormSubEditorView(props: FormSubEditorViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        role="tablist"
        aria-label="Form editor sections"
        className="flex h-10 shrink-0 overflow-x-auto border-b border-slate-300 bg-slate-100"
      >
        {formEditorTabs.map(tab => {
          const isSelected = tab === props.selectedTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => props.onSelectTab(tab)}
              className={`relative h-10 shrink-0 border-r border-slate-300 px-4 text-sm transition-colors ${
                isSelected
                  ? 'bg-white font-medium text-slate-900 after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-blue-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {props.selectedTab === 'Input & Output' && (
          <InputOutputEditor
            availableVariables={props.availableVariables}
            inputVariables={props.inputVariables}
            outputVariables={props.outputVariables}
            errors={props.errors}
            onAddInput={props.onAddInput}
            onSetInputTestValue={props.onSetInputTestValue}
            onRemoveInput={props.onRemoveInput}
            onAddOutput={props.onAddOutput}
            onRemoveOutput={props.onRemoveOutput}
          />
        )}
        {props.selectedTab === 'HTML' && <CodeEditor label="HTML" value={props.form.html} onChange={props.onHtmlChange} />}
        {props.selectedTab === 'CSS' && <CodeEditor label="CSS" value={props.form.css} onChange={props.onCssChange} />}
        {props.selectedTab === 'JS' && <CodeEditor label="JavaScript" value={props.form.js} onChange={props.onJsChange} />}
        {props.selectedTab === 'Preview' && <FormRenderer form={props.form} />}
      </div>
    </div>
  );
}

interface InputOutputEditorProps {
  availableVariables: string[];
  inputVariables: FormInputVariable[];
  outputVariables: FormOutputVariable[];
  errors: Record<string, string>;
  onAddInput: (name: string) => void;
  onSetInputTestValue: (index: number, testValue: string) => void;
  onRemoveInput: (index: number) => void;
  onAddOutput: (name: string) => void;
  onRemoveOutput: (index: number) => void;
}

function InputOutputEditor(props: InputOutputEditorProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-auto lg:grid-cols-2 lg:divide-x lg:divide-slate-200 lg:overflow-hidden">
      <VariablePanel
        title="Input variables"
        description="Variables supplied to the form. An optional example must be valid JSON for the variable schema."
        availableVariables={props.availableVariables}
        selectedNames={props.inputVariables.map(variable => variable.name)}
        onAdd={props.onAddInput}
      >
        {props.inputVariables.map((variable, index) => (
          <InputVariableRow
            key={`${variable.name}_${index}`}
            variable={variable}
            error={props.errors[`inputVariables.${index}`]}
            onTestValueChange={testValue => props.onSetInputTestValue(index, testValue)}
            onRemove={() => props.onRemoveInput(index)}
          />
        ))}
      </VariablePanel>

      <VariablePanel
        title="Output variables"
        description="Variables populated by the form."
        availableVariables={props.availableVariables}
        selectedNames={props.outputVariables.map(variable => variable.name)}
        onAdd={props.onAddOutput}
      >
        {props.outputVariables.map((variable, index) => (
          <VariableRow
            key={`${variable.name}_${index}`}
            name={variable.name}
            error={props.errors[`outputVariables.${index}`]}
            onRemove={() => props.onRemoveOutput(index)}
          />
        ))}
      </VariablePanel>
    </div>
  );
}

interface VariablePanelProps {
  title: string;
  description: string;
  availableVariables: string[];
  selectedNames: string[];
  onAdd: (name: string) => void;
  children: React.ReactNode;
}

function VariablePanel(props: VariablePanelProps) {
  const choices = props.availableVariables.filter(name => !props.selectedNames.includes(name));

  return (
    <section className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-b-0">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{props.title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{props.description}</p>
        <select
          value=""
          disabled={choices.length === 0}
          onChange={event => props.onAdd(event.target.value)}
          className="mt-3 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          aria-label={`Add ${props.title.toLowerCase()}`}
        >
          <option value="">{choices.length === 0 ? 'No variables available' : 'Add variable...'}</option>
          {choices.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 p-4 lg:min-h-0 lg:flex-1 lg:overflow-auto">
        {props.selectedNames.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
            No variables selected.
          </div>
        ) : (
          props.children
        )}
      </div>
    </section>
  );
}

interface InputVariableRowProps {
  variable: FormInputVariable;
  error?: string;
  onTestValueChange: (testValue: string) => void;
  onRemove: () => void;
}

function InputVariableRow(props: InputVariableRowProps) {
  return (
    <div className={`rounded-md border p-3 ${props.error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
      <VariableHeader name={props.variable.name} onRemove={props.onRemove} />
      <label className="mt-3 block">
        <span className="mb-1 block text-xs text-slate-500">Example JSON value (optional)</span>
        <textarea
          rows={3}
          value={props.variable.testValue ?? ''}
          onChange={event => props.onTestValueChange(event.target.value)}
          spellCheck={false}
          placeholder={'{"example": true}'}
          className={`w-full resize-y rounded-md border bg-white px-3 py-2 font-mono text-sm leading-5 text-slate-800 outline-none transition-colors ${
            props.error ? 'border-red-300 focus:border-red-400' : 'border-slate-300 focus:border-blue-400'
          }`}
        />
      </label>
      {props.error && <div className="mt-2 text-xs text-red-700">{props.error}</div>}
    </div>
  );
}

function VariableRow(props: { name: string; error?: string; onRemove: () => void }) {
  return (
    <div className={`rounded-md border p-3 ${props.error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
      <VariableHeader name={props.name} onRemove={props.onRemove} />
      {props.error && <div className="mt-2 text-xs text-red-700">{props.error}</div>}
    </div>
  );
}

function VariableHeader(props: { name: string; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-slate-800">${props.name}</div>
      <button
        type="button"
        onClick={props.onRemove}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label={`Remove variable ${props.name}`}
        title="Remove variable"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function CodeEditor(props: { label: string; value: string; onChange: (value: string) => void }) {
  const lineCount = props.value.length === 0 ? 0 : props.value.split(/\r\n|\r|\n/).length;

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <textarea
        value={props.value}
        onChange={event => props.onChange(event.target.value)}
        spellCheck={false}
        aria-label={`${props.label} source`}
        className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-white p-4 font-mono text-sm leading-6 text-slate-900 outline-none"
      />
      <div className="flex h-7 shrink-0 items-center justify-end gap-4 border-t border-slate-200 bg-slate-50 px-4 text-xs text-slate-500">
        <span>
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>
        <span>
          {props.value.length} {props.value.length === 1 ? 'character' : 'characters'}
        </span>
      </div>
    </section>
  );
}
