import { FormDefinition, ReturnStep, TaskStep } from '@ailaflow/shared';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';
import * as z from 'zod/v4';

export interface FormEditorOverlayData {
  title: string;
  form: FormDefinition;
  inputVariableNames: string[];
  outputVariableNames: string[];
}

export class FormEditorOverlayUtils {
  public static getData(state: ProcessEditorState): FormEditorOverlayData {
    const v = state.getOverlayObject<FormDefinition>(ProcessEditorOverlayType.FORM_EDITOR);
    let title: string;
    let inputVariableNames: string[];
    let outputVariableNames: string[];
    if (v.isRoot) {
      title = 'Start Form Editor';
      inputVariableNames = [];
      outputVariableNames = v.parent.properties.startVariableNames;
    } else if (v.parent.type === 'task') {
      const step = v.parent as TaskStep;
      title = `${step.name} - Form Editor`;
      inputVariableNames = step.properties.inputVariableNames;
      outputVariableNames = step.properties.outputVariableNames;
    } else if (v.parent.type === 'return') {
      const step = v.parent as ReturnStep;
      title = `${step.name} - Output Form Editor`;
      inputVariableNames = step.properties.outputVariableNames;
      outputVariableNames = [];
    } else {
      throw new Error('Unexpected step type');
    }
    return {
      form: v.value,
      title,
      inputVariableNames,
      outputVariableNames
    };
  }

  public static setInputJsonExample(
    state: ProcessEditorState,
    data: FormEditorOverlayData,
    variableName: string,
    content: unknown
  ): 'notInputVariable' | 'undefinedVariable' | 'invalidContent' | 'ok' {
    if (!data.inputVariableNames.includes(variableName)) {
      return 'notInputVariable';
    }
    const variable = state.definition.value.properties.variables.find(i => i.name === variableName);
    if (!variable) {
      return 'undefinedVariable';
    }
    const result = z.fromJSONSchema(variable.schema).safeParse(content);
    if (result.error) {
      return 'invalidContent';
    }
    const exampleValue = JSON.stringify(content);
    let example = data.form.inputExamples.find(i => i.variableName === variableName);
    if (!example) {
      example = { variableName, exampleValue };
      data.form.inputExamples.push(example);
    } else {
      example.exampleValue = exampleValue;
    }
    return 'ok';
  }
}
