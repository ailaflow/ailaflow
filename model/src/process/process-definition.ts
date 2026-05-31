import { Definition, Step } from 'sequential-workflow-model';

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

export interface ScriptStep extends Step {
  type: 'script';
  properties: {
    script: string;
  };
}

export interface ProcessDefinition extends Definition {
  properties: {
    variables: VariableDefinition[];
  };
}
