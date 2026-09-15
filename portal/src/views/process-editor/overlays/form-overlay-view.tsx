import type { FormDefinition, FormInputExample } from '@ailaflow/shared';
import { IframeForm } from '../../../routes/common/form-renderer/iframe-form';
import { FormAdapter } from '../../../routes/common/form-renderer/form-adapter';
import { CodeMirror, type CodeMirrorLanguage } from '../../common/codemirror';

export const formEditorTabs = ['Example Inputs', 'HTML', 'CSS', 'JS', 'Preview'] as const;
export type FormEditorTab = (typeof formEditorTabs)[number];

export interface FormOverlayViewProps {
  selectedTab: FormEditorTab;
  showExampleInputs: boolean;
  inputExamples: FormInputExample[];
  errors: Record<string, string>;
  form: FormDefinition;
  formAdapter: FormAdapter;
  onSelectTab: (tab: FormEditorTab) => void;
  onSetInputExampleValue: (index: number, exampleValue: string) => void;
  onHtmlChange: (value: string) => void;
  onCssChange: (value: string) => void;
  onJsChange: (value: string) => void;
}

export function FormOverlayView(props: FormOverlayViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        role="tablist"
        aria-label="Form editor sections"
        className="flex h-10 shrink-0 overflow-x-auto border-b border-slate-300 bg-slate-100"
      >
        {formEditorTabs
          .filter(tab => tab !== 'Example Inputs' || props.showExampleInputs)
          .map(tab => {
            const isSelected = tab === props.selectedTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => props.onSelectTab(tab)}
                className={`cursor-pointer relative h-10 shrink-0 border-r border-slate-300 px-4 text-sm transition-colors ${
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
        {props.selectedTab === 'Example Inputs' && (
          <ExampleInputsEditor
            inputExamples={props.inputExamples}
            errors={props.errors}
            onSetInputExampleValue={props.onSetInputExampleValue}
          />
        )}
        {props.selectedTab === 'HTML' && <CodeEditor label="HTML" language="html" value={props.form.html} onChange={props.onHtmlChange} />}
        {props.selectedTab === 'CSS' && <CodeEditor label="CSS" language="css" value={props.form.css} onChange={props.onCssChange} />}
        {props.selectedTab === 'JS' && (
          <CodeEditor label="JavaScript" language="javascript" value={props.form.js} onChange={props.onJsChange} />
        )}
        {props.selectedTab === 'Preview' && <IframeForm form={props.form} adapter={props.formAdapter} />}
      </div>
    </div>
  );
}

interface ExampleInputsEditorProps {
  inputExamples: FormInputExample[];
  errors: Record<string, string>;
  onSetInputExampleValue: (index: number, exampleValue: string) => void;
}

function ExampleInputsEditor(props: ExampleInputsEditorProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Example input values</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Optional example values must be valid JSON and match the input variable schema.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {props.inputExamples.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
            No input variables expected.
          </div>
        ) : (
          props.inputExamples.map((inputExample, index) => (
            <InputExampleRow
              key={inputExample.variableName}
              inputExample={inputExample}
              error={props.errors[`inputExamples.${index}`]}
              onExampleValueChange={exampleValue => props.onSetInputExampleValue(index, exampleValue)}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface InputExampleRowProps {
  inputExample: FormInputExample;
  error?: string;
  onExampleValueChange: (exampleValue: string) => void;
}

function InputExampleRow(props: InputExampleRowProps) {
  return (
    <div className={`rounded-md border p-3 ${props.error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
      <div className="truncate font-mono text-sm font-medium text-slate-800">${props.inputExample.variableName}</div>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs text-slate-500">Example JSON value (optional)</span>
        <textarea
          rows={3}
          value={props.inputExample.exampleValue ?? ''}
          onChange={event => props.onExampleValueChange(event.target.value)}
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

function CodeEditor(props: { label: string; language: CodeMirrorLanguage; value: string; onChange: (value: string) => void }) {
  const lineCount = props.value.length === 0 ? 0 : props.value.split(/\r\n|\r|\n/).length;

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <CodeMirror value={props.value} language={props.language} ariaLabel={`${props.label} source`} onChange={props.onChange} />
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
