export interface RouterAdapter {
  getCurrentRoute(): { path: string; params: Record<string, unknown> } | null;
  navigate(path: string): Promise<void>;
}
