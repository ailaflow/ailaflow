import { MyFormPopupView } from '../../../views/common/popups/my-form-popup-view';
import { ProcessIcon } from '../../../views/common/process-icon';
import { MyProcessStartForm, MyProcessStartFormArgs } from '../my-form/my-process-start-form';

export interface MyProcessStartFormPopupProps {
  args: MyProcessStartFormArgs;
  onClose(): void;
  onEnded: (candidateTaskIds?: string[]) => void;
}

export function MyProcessStartFormPopup(props: MyProcessStartFormPopupProps) {
  return (
    <MyFormPopupView
      title={`/${props.args.processName}`}
      titleIcon={<ProcessIcon name={props.args.processName} className="h-8 w-8" />}
      closeLabel="Close process form"
      onClose={props.onClose}
    >
      <MyProcessStartForm args={props.args} onEnded={props.onEnded} />
    </MyFormPopupView>
  );
}
