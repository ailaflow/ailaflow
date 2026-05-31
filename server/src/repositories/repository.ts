export interface Repository {
  setup(abortSignal: AbortSignal): Promise<void>;
}
