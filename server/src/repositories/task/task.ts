import { FormDefinition, JsonSchema } from '@aila/model';
import { randomBytes } from 'crypto';
import { TaskVariables } from './task-variables';

export class Task {
  public static create(
    title: string,
    executionId: string,
    isTest: boolean,
    inputVariableNames: string[],
    outputVariableSchemas: Record<string, JsonSchema> | null,
    form: FormDefinition | null,
    deadline: number | null
  ) {
    const id = randomBytes(24).toString('hex');
    const createdAt = Date.now();
    return new Task(id, title, executionId, isTest, inputVariableNames, outputVariableSchemas, form, deadline, createdAt);
  }

  private variablesCache: TaskVariables | null = null;

  public constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly executionId: string,
    public readonly isTest: boolean,
    public readonly inputVariableNames: string[],
    public readonly outputVariableSchemas: Record<string, JsonSchema> | null,
    public readonly form: FormDefinition | null,
    public readonly deadline: number | null,
    public readonly createdAt: number
  ) {}

  public canReadInputVariable(variableName: string): boolean {
    return this.inputVariableNames.includes(variableName);
  }

  public get variables(): TaskVariables {
    return this.variablesCache ?? (this.variablesCache = new TaskVariables(this.outputVariableSchemas));
  }
}
