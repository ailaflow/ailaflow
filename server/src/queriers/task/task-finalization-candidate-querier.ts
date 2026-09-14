export interface TaskFinalizationCandidate {
  id: string;
  deadline: number | null;
  finalizationRequestCount: number;
}

export interface TaskFinalizationCandidateQuerier {
  query(abortSignal: AbortSignal, now: number, limit: number): Promise<TaskFinalizationCandidate[]>;
}
