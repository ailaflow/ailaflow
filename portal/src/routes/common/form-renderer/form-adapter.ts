import { ProcessExecutionVariableValues } from '@ailaflow/shared';

export interface FormError {
  message: string;
  stack?: string;
}

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

  openStartForm(signal: AbortSignal): Promise<void>;
  submitForm(signal: AbortSignal, values: ProcessExecutionVariableValues): Promise<void>;
  readVariable(signal: AbortSignal, variableName: string): Promise<unknown>;

  collectFormError?: (error: FormError) => void;
}
