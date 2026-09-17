import { MyFormPopupView } from '../../../views/common/popups/my-form-popup-view';
import { MyProcessStartForm, MyProcessStartFormArgs } from '../my-form/my-process-start-form';

export interface MyProcessStartFormPopupProps {
  args: MyProcessStartFormArgs;
  onClose(): void;
}

export function MyProcessStartFormPopup(props: MyProcessStartFormPopupProps) {
  async function onEnded() {
    props.onClose();
  }

  return (
    <MyFormPopupView title={`/${props.args.processName}`} closeLabel="Close process form" onClose={props.onClose}>
      <MyProcessStartForm args={props.args} onEnded={onEnded} />
    </MyFormPopupView>
  );
}
