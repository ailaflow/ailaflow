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
  submitForm(abortSignal: AbortSignal, outputValues: ProcessExecutionVariableValues): Promise<void>;
  readVariable(abortSignal: AbortSignal, variableName: string): Promise<unknown>;

  /**
   * Starts a process with the provided input values.
   *
   * @param processName Name of the process to start. When `null`, the current process is used.
   * @param inputValues Initial variable values for the process.
   */
  startProcess(abortSignal: AbortSignal, processName: string | null, inputValues: ProcessExecutionVariableValues): Promise<void>;
}
