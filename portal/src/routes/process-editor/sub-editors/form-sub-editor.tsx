import type { FormDefinition, FormInputVariable } from '@aila/model';
import { FormDefinitionValidator } from '@aila/model';
import { useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { DefinitionPath } from '../../../core/definition-path';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { FormEditorTab, FormSubEditorView } from '../../../views/process-editor/script-sub-editor/form-sub-editor-view';
import { useProcessEditor } from '../process-editor-context';

export function FormSubEditor() {
  const state = useProcessEditor();
  const availableVariables = state.definition.value.properties.variables.map(variable => variable.name);
  const [selectedTab, setSelectedTab] = useState<FormEditorTab>('Input & Output');

  const [formState, setFormState] = useState(() => {
    const form = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.subPath!);
    return {
      form,
      errors: FormDefinitionValidator.validate(form, state.definition.value, state.variableValidator)
    };
  });

  function setForm(form: FormDefinition) {
    setFormState({
      form,
      errors: FormDefinitionValidator.validate(form, state.definition.value, state.variableValidator)
    });
  }

  function addInputVariable(name: string) {
    if (!name || formState.form.inputVariables?.some(variable => variable.name === name)) {
      return;
    }
    setForm({
      ...formState.form,
      inputVariables: [...(formState.form.inputVariables ?? []), { name }]
    });
  }

  function updateInputVariable(index: number, variable: FormInputVariable) {
    setForm({
      ...formState.form,
      inputVariables: formState.form.inputVariables?.map((current, currentIndex) => (currentIndex === index ? variable : current))
    });
  }

  function removeInputVariable(index: number) {
    setForm({
      ...formState.form,
      inputVariables: removeAt(formState.form.inputVariables, index)
    });
  }

  function setInputTestValue(index: number, testValue: string) {
    const variable = formState.form.inputVariables?.[index];
    if (!variable) {
      return;
    }

    const nextVariable = { ...variable };
    if (testValue) {
      nextVariable.testValue = testValue;
    } else {
      delete nextVariable.testValue;
    }
    updateInputVariable(index, nextVariable);
  }

  function addOutputVariable(name: string) {
    if (!name || formState.form.outputVariables?.some(variable => variable.name === name)) {
      return;
    }
    setForm({
      ...formState.form,
      outputVariables: [...(formState.form.outputVariables ?? []), { name }]
    });
  }

  function removeOutputVariable(index: number) {
    setForm({
      ...formState.form,
      outputVariables: removeAt(formState.form.outputVariables, index)
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
        availableVariables={availableVariables}
        inputVariables={formState.form.inputVariables ?? []}
        outputVariables={formState.form.outputVariables ?? []}
        errors={formState.errors}
        form={formState.form}
        onSelectTab={setSelectedTab}
        onAddInput={addInputVariable}
        onSetInputTestValue={setInputTestValue}
        onRemoveInput={removeInputVariable}
        onAddOutput={addOutputVariable}
        onRemoveOutput={removeOutputVariable}
        onHtmlChange={html => setForm({ ...formState.form, html })}
        onCssChange={css => setForm({ ...formState.form, css })}
        onJsChange={js => setForm({ ...formState.form, js })}
      />
    </ProcessSubEditorView>
  );
}

function removeAt<T>(items: T[] | undefined, index: number): T[] | undefined {
  const nextItems = items?.filter((_, currentIndex) => currentIndex !== index);
  return nextItems && nextItems.length > 0 ? nextItems : undefined;
}
