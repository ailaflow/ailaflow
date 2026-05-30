import { Definition } from 'sequential-workflow-model';

export interface VariableDefinition {
  name: string;
  description: string;
  input: boolean;
  output: boolean;
  schema: {
    type: string;
    properties?: Record<string, unknown>;
  };
}

export interface ProcessDefinition extends Definition {
  properties: {
    variables: VariableDefinition[];
  };
}
