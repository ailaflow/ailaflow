import type { FormDefinition, FormInputExample } from '@ailaflow/shared';
import { FormDefinitionValidator, VariableCachedValidator } from '@ailaflow/shared';
import { useMemo, useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
import { FormEditorTab, FormOverlayView } from '../../../views/process-editor/overlays/form-overlay-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { useProcessEditor } from '../process-editor-context';
import { FormEditorOverlayUtils } from './form-editor-overlay-utils';
import { FormAdapter } from '../../common/form-renderer/form-adapter';
import { SvgIcon } from '../../../views/common/svg-icons';

export function FormEditorOverlay() {
  const state = useProcessEditor();
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);

  const formState = useMemo(() => {
    const { form, inputVariableNames, outputVariableNames } = FormEditorOverlayUtils.getData(state);
    const normalizedForm = {
      ...form,
      inputExamples: inputVariableNames.map(variableName => {
        return form.inputExamples.find(example => example.variableName === variableName) ?? { variableName };
      })
    };
    return {
      form: normalizedForm,
      inputVariableNames,
      outputVariableNames,
      errors: FormDefinitionValidator.validate(normalizedForm, inputVariableNames, state.definition.value, state.variableValidator)
    };
  }, [state]);

  const formAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: null,
      outputVariableNames: formState.outputVariableNames,

      assertVariableValue(name: string, value: unknown) {
        variableValidator.assertVariableValueIsValid(name, value, state.definition.value);
      },
      async readVariable(_: AbortSignal, name: string) {
        const example = formState.form.inputExamples.find(example => example.variableName === name);
        if (!example || !example.exampleValue) {
          throw new Error(`Not found example value for variable \$${name}`);
        }
        return JSON.parse(example.exampleValue);
      },
      async submitForm() {
        window.alert('Form was submitted correctly');
      },
      async startProcess() {
        throw new Error('Not implemented');
      }
    }),
    [state, formState, variableValidator]
  );

  const [selectedTab, setSelectedTab] = useState<FormEditorTab>(formState.inputVariableNames.length > 0 ? 'Example Inputs' : 'HTML');
  const selectedVisibleTab = selectedTab === 'Example Inputs' && formState.inputVariableNames.length === 0 ? 'HTML' : selectedTab;

  function setForm(form: FormDefinition) {
    const { value } = state.getOverlayObject<FormDefinition>(ProcessEditorOverlayType.FORM_EDITOR);
    Object.assign(value, form);
    state.setDefinition(wrapDefinition(state.definition.value), true);
  }

  function setInputExampleValue(index: number, exampleValue: string) {
    const inputExample = formState.form.inputExamples[index];
    if (!inputExample) {
      return;
    }

    const nextInputExample: FormInputExample = { ...inputExample };
    if (exampleValue) {
      nextInputExample.exampleValue = exampleValue;
    } else {
      delete nextInputExample.exampleValue;
    }
    setForm({
      ...formState.form,
      inputExamples: formState.form.inputExamples.map((current, currentIndex) => (currentIndex === index ? nextInputExample : current))
    });
  }

  function ok() {
    if (Object.keys(formState.errors).length > 0) {
      return;
    }

    state.closeOverlay();
  }

  return (
    <ProcessOverlayView
      title="Form Editor"
      isOkVisible={state.isDirty}
      isOkEnabled={state.isDirty && Object.keys(formState.errors).length === 0}
      closeContent={state.isDirty ? 'Cancel' : <SvgIcon name="x" className="h-4 w-4" />}
      closeAriaLabel={state.isDirty ? 'Cancel' : 'Back to designer'}
      onClose={state.closeOverlay}
      onOk={ok}
    >
      <FormOverlayView
        selectedTab={selectedVisibleTab}
        showExampleInputs={formState.inputVariableNames.length > 0}
        inputExamples={formState.form.inputExamples}
        errors={formState.errors}
        form={formState.form}
        formAdapter={formAdapter}
        onSelectTab={setSelectedTab}
        onSetInputExampleValue={setInputExampleValue}
        onHtmlChange={html => setForm({ ...formState.form, html })}
        onCssChange={css => setForm({ ...formState.form, css })}
        onJsChange={js => setForm({ ...formState.form, js })}
      />
    </ProcessOverlayView>
  );
}
