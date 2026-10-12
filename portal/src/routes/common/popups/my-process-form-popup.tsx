import { GenericPopupView } from '../../../views/common/popups/generic-popup-view';
import { ProcessIcon } from '../../../views/common/process-icon';
import { MyProcessForm, MyProcessFormArgs } from '../my-form/my-process-form';

export interface MyProcessFormPopupProps {
  args: MyProcessFormArgs;
  icon: string | null;
  onClose(): void;
  onEnded: (candidateTaskIds?: string[]) => void;
}

export function MyProcessFormPopup(props: MyProcessFormPopupProps) {
  return (
    <GenericPopupView
      size="large"
      title={`/${props.args.processName}`}
      titleIcon={<ProcessIcon name={props.args.processName} icon={props.icon} className="h-8 w-8" />}
      closeLabel="Close process form"
      onClose={props.onClose}
    >
      <MyProcessForm args={props.args} onEnded={props.onEnded} />
    </GenericPopupView>
  );
}
