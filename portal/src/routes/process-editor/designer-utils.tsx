import { ProcessDefinition } from '@aila/model';

export class DesignerUtils {
  public static createEmptyDefinition(): ProcessDefinition {
    return {
      properties: {
        startVariableNames: [],
        variables: []
      },
      sequence: []
    };
  }
}
