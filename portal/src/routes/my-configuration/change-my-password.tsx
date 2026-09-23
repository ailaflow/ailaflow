import { UserValidator } from '@ailaflow/shared';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { ChangeMyPasswordView } from '../../views/my-configuration/change-my-password-view';

export function ChangeMyPassword() {
  const apiClient = useApiClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const newPasswordError = UserValidator.validatePassword(newPassword);
  const confirmedPasswordError = newPassword === confirmedPassword ? null : 'Passwords do not match';
  const canSubmit =
    !isSubmitting &&
    currentPassword.length > 0 &&
    newPasswordError === null &&
    confirmedPassword.length > 0 &&
    confirmedPasswordError === null;

  function updatePassword(setPassword: (password: string) => void, password: string): void {
    setPassword(password);
    setError(null);
    setSuccess(false);
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.myConfiguration.changePassword(AbortSignal.timeout(10_000), {
        currentPassword,
        newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmedPassword('');
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ChangeMyPasswordView
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmedPassword={confirmedPassword}
      newPasswordError={newPassword.length > 0 ? newPasswordError : null}
      confirmedPasswordError={confirmedPassword.length > 0 ? confirmedPasswordError : null}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
      error={error}
      success={success}
      onCurrentPasswordChange={password => updatePassword(setCurrentPassword, password)}
      onNewPasswordChange={password => updatePassword(setNewPassword, password)}
      onConfirmedPasswordChange={password => updatePassword(setConfirmedPassword, password)}
      onSubmit={submit}
    />
  );
}
