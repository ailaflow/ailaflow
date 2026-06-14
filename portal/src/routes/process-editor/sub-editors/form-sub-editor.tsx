import type { FormDefinition, FormInputExample, TaskStep } from '@aila/model';
import { FormDefinitionValidator } from '@aila/model';
import { useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { DefinitionPath } from '../../../core/definition-path';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { FormEditorTab, FormSubEditorView } from '../../../views/process-editor/script-sub-editor/form-sub-editor-view';
import { useProcessEditor } from '../process-editor-context';

export function FormSubEditor() {
  const state = useProcessEditor();

  const [formState, setFormState] = useState(() => {
    const { isRoot, object, value: form } = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.subPath!);
    const inputVariableNames = isRoot ? [] : (object as TaskStep).properties.inputVariableNames;
    const normalizedForm = {
      ...form,
      inputExamples: inputVariableNames.map(variableName => {
        return form.inputExamples.find(example => example.variableName === variableName) ?? { variableName };
      })
    };
    return {
      form: normalizedForm,
      inputVariableNames,
      errors: FormDefinitionValidator.validate(
        normalizedForm,
        inputVariableNames,
        state.definition.value,
        state.variableValidator
      )
    };
  });
  const [selectedTab, setSelectedTab] = useState<FormEditorTab>(
    formState.inputVariableNames.length > 0 ? 'Example Inputs' : 'HTML'
  );

  function setForm(form: FormDefinition) {
    setFormState(s => ({
      ...s,
      form,
      errors: FormDefinitionValidator.validate(form, s.inputVariableNames, state.definition.value, state.variableValidator)
    }));
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
      inputExamples: formState.form.inputExamples.map((current, currentIndex) =>
        currentIndex === index ? nextInputExample : current
      )
    });
  }

  function ok() {
    if (Object.keys(formState.errors).length > 0) {
      return;
    }

    const newDefinition = {
      ...state.definition.value
    };
    DefinitionPath.writePath(newDefinition, state.subPath!, formState.form);
    state.setDefinition(wrapDefinition(newDefinition), true);
    state.switchToDesigner();
  }

  return (
    <ProcessSubEditorView
      title="Form Editor"
      canOk={Object.keys(formState.errors).length === 0}
      onCancel={state.switchToDesigner}
      onOk={ok}
    >
      <FormSubEditorView
        selectedTab={selectedTab}
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
