export interface ToolDescriptor {
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    strict?: boolean | null;
  };
  type: 'function';
}
