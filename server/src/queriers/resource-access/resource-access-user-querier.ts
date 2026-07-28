export interface ResourceAccessUserQuerier {
  queryAssignedUserNames(abortSignal: AbortSignal, resourceId: string): Promise<string[]>;
}
