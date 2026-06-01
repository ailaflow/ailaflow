import { Definition } from 'sequential-workflow-model';

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
}

export interface VariableDefinition {
  name: string;
  description: string;
  input: boolean;
  output: boolean;
  schema: JsonSchema;
}

export interface ProcessDefinition extends Definition {
  properties: {
    variables: VariableDefinition[];
  };
}
