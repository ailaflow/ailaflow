import { AlertPopupView } from '../../../views/common/popups/alert-popup-view';

export interface FormSubmittedAlertPopupProps {
  onClose(): void;
}

export function FormSubmittedAlertPopup(props: FormSubmittedAlertPopupProps) {
  return (
    <AlertPopupView
      theme="info"
      title="Form submitted successfully"
      content={['The form was submitted successfully, but the process did not return any data.']}
      closeLabel="Close form submission notification"
      actionLabel="Close"
      onClose={props.onClose}
    />
  );
}
