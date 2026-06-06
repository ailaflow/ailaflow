export interface ScriptContent {
  path: string;
  mimeType: string;
  content: string;
  modifiedAt: number;
}

export interface Script {
  /**
   * If `null` then the default sandbox will be used.
   */
  sandboxName: string | null;
  contents: ScriptContent[];
}
