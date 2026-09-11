export interface ToolCall {
  id: string;
  function: {
    arguments: string;
    name: string;
  };
  type: 'function';
}
