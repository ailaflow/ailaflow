import { createTaskStepComponentViewFactory, DesignerExtension, Step, StepExtension } from 'sequential-workflow-designer';

export class InterruptingTaskStepExtension implements StepExtension<Step> {
  public static createExtension(): DesignerExtension {
    return {
      steps: [new InterruptingTaskStepExtension()]
    };
  }

  public readonly componentType = 'interruptingTask';

  public readonly createComponentView = createTaskStepComponentViewFactory(true, {
    paddingLeft: 12,
    paddingRight: 12,
    paddingY: 10,
    textMarginLeft: 12,
    minTextWidth: 70,
    iconSize: 22,
    radius: 5,
    inputSize: 14,
    outputSize: 10
  });
}
