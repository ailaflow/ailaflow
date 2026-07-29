import { FormDefinition } from '@aila/model';
import { randomBytes } from 'crypto';

export class Task {
  public static create(
    title: string,
    executionId: string,
    inputVariableNames: string[],
    outputVariableNames: string[],
    form: FormDefinition | null,
    deadline: number | null
  ) {
    const id = randomBytes(24).toString('hex');
    const createdAt = Date.now();
    return new Task(id, title, executionId, inputVariableNames, outputVariableNames, form, deadline, createdAt);
  }

  public constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly executionId: string,
    public readonly inputVariableNames: string[],
    public readonly outputVariableNames: string[],
    public readonly form: FormDefinition | null,
    public readonly deadline: number | null,
    public readonly createdAt: number
  ) {}
}
