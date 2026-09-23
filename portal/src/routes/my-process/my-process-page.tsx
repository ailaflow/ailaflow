import { useNavigate, useParams, useSearchParams } from 'react-router';
import { MyFullscreenView } from '../../views/my-form/my-fullscreen-view';
import { MyFormView } from '../../views/my-form/my-form-view';
import { MyProcessStartForm } from '../common/my-form/my-process-start-form';
import { Portal } from '../common/portal';

export function MyProcessPage() {
  const { name } = useParams();
  if (!name) {
    throw new Error('Process name is required');
  }

  const [searchParams] = useSearchParams();
  const fullscreen = searchParams.get('fs') === '1';
  const navigate = useNavigate();

  function goToProcesses(): void {
    navigate('/my-processes', { replace: true });
  }

  if (fullscreen) {
    return (
      <MyFullscreenView>
        <MyProcessStartForm args={{ processName: name }} onEnded={goToProcesses} />
      </MyFullscreenView>
    );
  }
  return (
    <Portal>
      <MyFormView icon="/" title="Start process" description={name} backLabel="Back to processes" onBack={goToProcesses}>
        <MyProcessStartForm args={{ processName: name }} onEnded={goToProcesses} />
      </MyFormView>
    </Portal>
  );
}
