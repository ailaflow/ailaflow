import { FormDefinition, TaskStep } from '@aila/model';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';

export interface FormChildEditorData {
  form: FormDefinition;
  inputVariableNames: string[];
  outputVariableNames: string[];
}

export class FormChildEditorUtils {
  public static getData(state: ProcessEditorState): FormChildEditorData {
    const v = state.getOverlayObject<FormDefinition>(ProcessEditorOverlayType.FORM_EDITOR);
    const inputVariableNames = v.isRoot ? [] : (v.parent as TaskStep).properties.inputVariableNames;
    const outputVariableNames = v.isRoot ? [] : (v.parent as TaskStep).properties.outputVariableNames;
    return {
      form: v.value,
      inputVariableNames,
      outputVariableNames
    };
  }
}
