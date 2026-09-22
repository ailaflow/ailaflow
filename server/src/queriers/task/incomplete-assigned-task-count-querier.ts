export interface IncompleteAssignedTaskCountQuerier {
  queryIncompleteAssignedTaskCount(signal: AbortSignal, taskId: string): Promise<number>;
}
