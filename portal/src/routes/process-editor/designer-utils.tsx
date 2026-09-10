import { fnv1a } from '@aibindkit/core';
import { ProcessDefinition } from '@ailaflow/shared';
import { BranchedStep, Sequence, SequentialStep, Step } from 'sequential-workflow-model';

export class DesignerUtils {
  public static calcDefinitionHash(definition: ProcessDefinition): string {
    return fnv1a(definition);
  }

  public static getStepSequence(step: Step, branchName?: string): Sequence {
    if (branchName) {
      const b = step as BranchedStep;
      if (typeof b.branches === 'object') {
        const bb = b.branches[branchName];
        if (bb && Array.isArray(bb)) {
          return b.branches[branchName];
        }
      }
    }
    const s = step as SequentialStep;
    if (s.sequence && Array.isArray(s.sequence)) {
      return s.sequence;
    }
    throw new Error('Cannot find a sequence in the target step');
  }
}
