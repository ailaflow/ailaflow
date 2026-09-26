import { ProcessExecutionVariableValues } from '@ailaflow/shared';

export interface FormError {
  message: string;
  stack?: string;
}

export type FormTransientParams = Record<string, unknown>;

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

  openStartForm(signal: AbortSignal, transientParams?: FormTransientParams): Promise<void>;
  submitForm(signal: AbortSignal, values: ProcessExecutionVariableValues, transientParams?: FormTransientParams): Promise<void>;
  readVariable(signal: AbortSignal, variableName: string): Promise<unknown>;
  getTransientParams(): FormTransientParams | null;

  collectFormError?: (error: FormError) => void;
}
