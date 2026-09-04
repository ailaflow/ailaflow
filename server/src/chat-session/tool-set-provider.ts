import { fnv1a } from '@aibindkit/core';
import { Tool } from '@aibindkit/llm';

export class ToolSetProvider {
  public readonly hash: string;

  public constructor(public readonly tools: Tool[]) {
    this.hash = fnv1a(tools.map(t => t.descriptor));
  }
}
