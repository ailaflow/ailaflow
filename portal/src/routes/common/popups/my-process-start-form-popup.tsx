import { MyFormPopupView } from '../../../views/common/popups/my-form-popup-view';
import { MyProcessStartForm, MyProcessStartFormArgs } from '../my-form/my-process-start-form';

export interface MyProcessStartFormPopupProps {
  args: MyProcessStartFormArgs;
  onStarted?(executionId: string): void | Promise<void>;
  onClose(): void;
}

export function MyProcessStartFormPopup(props: MyProcessStartFormPopupProps) {
  async function processStarted(executionId: string): Promise<void> {
    await props.onStarted?.(executionId);
    props.onClose();
  }

  return (
    <MyFormPopupView title={`/${props.args.processName}`} closeLabel="Close process form" onClose={props.onClose}>
      <MyProcessStartForm args={props.args} onStarted={processStarted} />
    </MyFormPopupView>
  );
}
