import { AlertPopupView } from '../../../views/common/popups/alert-popup-view';

export interface LicenseAlertPopupProps {
  error: string;
  onClose(): void;
}

export function LicenseAlertPopup(props: LicenseAlertPopupProps) {
  return (
    <AlertPopupView
      theme="warn"
      title="License warning"
      content={[
        `This AilaFlow instance has a license validation issue: "${props.error}".`,
        'Please contact your administrator to resolve the issue.'
      ]}
      closeLabel="Close license warning"
      actionLabel="Continue working"
      onClose={props.onClose}
    />
  );
}
