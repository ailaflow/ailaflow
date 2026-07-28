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
  submit(abortSignal: AbortSignal, data: Record<string, unknown>): Promise<void>;
  readVariable(abortSignal: AbortSignal, variableName: string): Promise<unknown>;
}
