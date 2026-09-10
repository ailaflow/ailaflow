import { ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { VariableDefinition } from '@ailaflow/shared';

export class ListVariablesTool extends ZodTool {
  public constructor(private readonly variables: VariableDefinition[]) {
    super(
      'listVariables',
      'Lists the available process variable names, descriptions, and schemas. Use readVariable to read their current values.'
    );
  }

  protected async handle(): Promise<ZodToolExecutionResult> {
    return { content: { variables: this.variables } };
  }
}
