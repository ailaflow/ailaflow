export interface IncompleteAssignedTaskCountQuerier {
  queryIncompleteAssignedTaskCount(abortSignal: AbortSignal, taskId: string): Promise<number>;
}
