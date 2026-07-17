import type { FormDefinition, FormInputExample } from '@aila/model';
import { FormDefinitionValidator } from '@aila/model';
import { useMemo, useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { FormEditorTab, FormSubEditorView } from '../../../views/process-editor/script-sub-editor/form-sub-editor-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { useProcessEditor } from '../process-editor-context';
import { FormEditorOverlayUtils } from './form-editor-overlay-utils';

export function FormEditorOverlay() {
  const state = useProcessEditor();

  const formState = useMemo(() => {
    const { form, inputVariableNames } = FormEditorOverlayUtils.getData(state);
    const normalizedForm = {
      ...form,
      inputExamples: inputVariableNames.map(variableName => {
        return form.inputExamples.find(example => example.variableName === variableName) ?? { variableName };
      })
    };
    return {
      form: normalizedForm,
      inputVariableNames,
      errors: FormDefinitionValidator.validate(normalizedForm, inputVariableNames, state.definition.value, state.variableValidator)
    };
  }, [state.overlay, state.definition, state.variableValidator]);

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
    <ProcessSubEditorView title="Form Editor" canOk={Object.keys(formState.errors).length === 0} onCancel={state.closeOverlay} onOk={ok}>
      <FormSubEditorView
        selectedTab={selectedVisibleTab}
        showExampleInputs={formState.inputVariableNames.length > 0}
        inputExamples={formState.form.inputExamples}
        errors={formState.errors}
        form={formState.form}
        onSelectTab={setSelectedTab}
        onSetInputExampleValue={setInputExampleValue}
        onHtmlChange={html => setForm({ ...formState.form, html })}
        onCssChange={css => setForm({ ...formState.form, css })}
        onJsChange={js => setForm({ ...formState.form, js })}
      />
    </ProcessSubEditorView>
  );
}
