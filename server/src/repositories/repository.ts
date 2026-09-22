export interface Repository {
  setup(signal: AbortSignal): Promise<void>;
}
