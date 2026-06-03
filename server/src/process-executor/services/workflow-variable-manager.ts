import { WorkflowMachineVariablesState } from '../workflow-machine-global-state';

export class WorkflowVariableManager {
  public constructor(private readonly state: WorkflowMachineVariablesState) {}

  public get(name: string): unknown {
    const value = this.state[name];
    if (value === undefined) {
      throw new Error(`Variable "${name}" is not defined`);
    }
    return value;
  }
}
