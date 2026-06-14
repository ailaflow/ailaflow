import { Definition } from 'sequential-workflow-model';
import { FormDefinition } from './form-definition';
import { VariableDefinition } from './variable-definition';

export interface ProcessDefinition extends Definition {
  properties: {
    startForm?: FormDefinition;
    startVariableNames: string[];
    variables: VariableDefinition[];
  };
}
