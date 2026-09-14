import { FormDefinition, JsonSchema, TaskFinalizationPolicy } from '@ailaflow/shared';
import { TaskVariables } from './task-variables';
import { randomUUID } from 'node:crypto';

export class Task {
  public static create(
    title: string,
    isTest: boolean,
    createdBy: string,
    executionId: string,
    inputVariableNames: string[],
    outputVariableSchemas: Record<string, JsonSchema> | null,
    form: FormDefinition | null,
    deadline: number | null,
    finalizationPolicy: TaskFinalizationPolicy,
    metadataVariableName: string | null
  ) {
    const id = randomUUID();
    const createdAt = Date.now();
    return new Task(
      id,
      title,
      isTest,
      createdBy,
      executionId,
      inputVariableNames,
      outputVariableSchemas,
      form,
      deadline,
      finalizationPolicy,
      metadataVariableName,
      0,
      null,
      createdAt,
      null
    );
  }

  private variablesCache: TaskVariables | null = null;

  public constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly isTest: boolean,
    public readonly createdBy: string,
    public readonly executionId: string,
    public readonly inputVariableNames: string[],
    public readonly outputVariableSchemas: Record<string, JsonSchema> | null,
    public readonly form: FormDefinition | null,
    public readonly deadline: number | null,
    public readonly finalizationPolicy: TaskFinalizationPolicy,
    public readonly metadataVariableName: string | null,
    public readonly finalizationRequestCount: number,
    public readonly nextFinalizationAttemptAt: number | null,
    public readonly createdAt: number,
    public readonly finalizedAt: number | null
  ) {}

  public canReadInputVariable(variableName: string): boolean {
    return this.inputVariableNames.includes(variableName);
  }

  public get variables(): TaskVariables {
    return this.variablesCache ?? (this.variablesCache = new TaskVariables(this.outputVariableSchemas));
  }
}
