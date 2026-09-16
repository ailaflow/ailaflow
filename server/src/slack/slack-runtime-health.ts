export interface SlackRuntimeHealthProvider {
  getHealth(): { isOperational: boolean; isConnected: boolean; lastError: string | null };
}
