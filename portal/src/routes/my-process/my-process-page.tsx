import { useNavigate, useParams, useSearchParams } from 'react-router';
import { MyFullscreenView } from '../../views/my-form/my-fullscreen-view';
import { MyFormView } from '../../views/my-form/my-form-view';
import { MyProcessForm } from '../common/my-form/my-process-form';

export function MyProcessPage() {
  const { name: processName } = useParams();
  if (!processName) {
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
        <MyProcessForm args={{ processName }} onEnded={goToProcesses} />
      </MyFullscreenView>
    );
  }
  return (
    <MyFormView icon="/" title="Start process" description={processName} backLabel="Back to processes" onBack={goToProcesses}>
      <MyProcessForm args={{ processName }} onEnded={goToProcesses} />
    </MyFormView>
  );
}
