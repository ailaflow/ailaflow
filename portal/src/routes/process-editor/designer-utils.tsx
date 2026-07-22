import { fnv1a } from '@aibindkit/core';
import { JsonSchemaWithHash, ProcessDefinition, ScriptDefinition, ScriptStep } from '@aila/model';
import { BranchedStep, DefinitionWalker, Sequence, SequentialStep, Step } from 'sequential-workflow-model';

export class DesignerUtils {
  public static createBlankDefinition(): ProcessDefinition {
    return {
      properties: {
        startVariableNames: [],
        variables: []
      },
      sequence: []
    };
  }

  public static calcDefinitionHash(definition: ProcessDefinition): string {
    return fnv1a(definition);
  }

  public static updateDefinitionHashes(walker: DefinitionWalker, definition: ProcessDefinition) {
    if (definition.properties.variables) {
      for (const variable of definition.properties.variables) {
        updateVariableSchemaHash(variable.schema);
      }
    }
    walker.forEach(definition, step => {
      if (step.type === 'script') {
        const scriptStep = step as ScriptStep;
        updateScriptHash(scriptStep.properties.script);
      }
    });
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

function updateVariableSchemaHash(variable: JsonSchemaWithHash) {
  variable.hash = fnv1a(variable.schema);
}

function updateScriptHash(script: ScriptDefinition) {
  script.hash = fnv1a(script.contents);
}
