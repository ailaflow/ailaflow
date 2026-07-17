export interface RouterAdapter {
  getCurrentRoute(): CurrentRoute | null;
  navigate(path: string): Promise<void>;
}

export interface CurrentRoute {
  path: string;
  params: Record<string, unknown>;
}
