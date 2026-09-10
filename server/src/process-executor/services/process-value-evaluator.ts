import { StringOrVariable } from '@ailaflow/model';
import { ProcessVariableManager } from './process-variable-manager';

export class ProcessVariableEvaluator {
  public constructor(private readonly variableManager: ProcessVariableManager) {}

  public evaluateStringOrVariable(sov: StringOrVariable): string {
    if (sov.type === 'string') {
      return sov.value;
    }
    if (sov.type === 'variable') {
      const value = this.variableManager.get<string>(sov.name);
      if (value === null) {
        throw new Error(`Variable \$${sov.name} does not have a value`);
      }
      return value;
    }
    throw new Error('Invalid type');
  }
}
