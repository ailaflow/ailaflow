import { ProcessExecutionVariableValues } from '@ailaflow/shared';

export interface FormAdapter {
  /**
   * If `null` then all variables are allowed to be read.
   */
  allowedToReadVariableNames: string[] | null;

  /**
   * Required output variable names.
   */
  outputVariableNames: string[];

  assertVariableValue(variableName: string, value: unknown): void;

  openStartForm(abortSignal: AbortSignal): Promise<void>;
  submitForm(abortSignal: AbortSignal, values: ProcessExecutionVariableValues): Promise<void>;
  readVariable(abortSignal: AbortSignal, variableName: string): Promise<unknown>;
}
