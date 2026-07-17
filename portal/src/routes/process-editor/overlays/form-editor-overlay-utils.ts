import { FormDefinition, TaskStep } from '@aila/model';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';
import z from 'zod/v4';

export interface FormEditorOverlayData {
  form: FormDefinition;
  inputVariableNames: string[];
  outputVariableNames: string[];
}

export class FormEditorOverlayUtils {
  public static getData(state: ProcessEditorState): FormEditorOverlayData {
    const v = state.getOverlayObject<FormDefinition>(ProcessEditorOverlayType.FORM_EDITOR);
    const inputVariableNames = v.isRoot ? v.parent.properties.startVariableNames : (v.parent as TaskStep).properties.inputVariableNames;
    const outputVariableNames = v.isRoot ? [] : (v.parent as TaskStep).properties.outputVariableNames;
    return {
      form: v.value,
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
      example = { variableName: variableName, exampleValue };
      data.form.inputExamples.push(example);
    } else {
      example.exampleValue = exampleValue;
    }
    return 'ok';
  }
}
