export interface ExecutionTaskCandidateQuerier {
  query(signal: AbortSignal, executionId: string, userName: string, isTest: boolean, now: number, limit: number): Promise<string[]>;
}
