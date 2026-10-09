import { GenericPopupView } from '../../../views/common/popups/generic-popup-view';
import { MyTaskForm, MyTaskFormArgs } from '../my-form/my-task-form';

export interface MyTaskFormPopupProps {
  args: MyTaskFormArgs;
  onSubmitted?(): void | Promise<void>;
  onClose(): void;
}

export function MyTaskFormPopup(props: MyTaskFormPopupProps) {
  async function taskSubmitted(): Promise<void> {
    await props.onSubmitted?.();
    props.onClose();
  }

  return (
    <GenericPopupView title="Task" closeLabel="Close task form" onClose={props.onClose}>
      <MyTaskForm args={props.args} onSubmitted={taskSubmitted} />
    </GenericPopupView>
  );
}
