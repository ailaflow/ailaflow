import { LicenseWarningPopupView } from '../../../views/common/popups/license-warning-popup-view';

export interface LicenseWarningPopupProps {
  error: string;
  onClose(): void;
}

export function LicenseWarningPopup(props: LicenseWarningPopupProps) {
  return <LicenseWarningPopupView error={props.error} onClose={props.onClose} />;
}
