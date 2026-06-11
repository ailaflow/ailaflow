export interface ScriptContent {
  path: string;
  mimeType: string;
  content: string;
  modifiedAt: number;
}

export interface Script {
  sandboxName: string;
  contents: ScriptContent[];
  hash: string;
}
