import { useNavigate, useParams } from 'react-router-dom';
import { MyFormView } from '../../views/my-form/my-form-view';
import { MyProcessStartForm } from '../common/my-form/my-process-start-form';
import { Portal } from '../common/portal';

export function MyProcessPage() {
  const { name } = useParams();
  if (!name) {
    throw new Error('Process name is required');
  }

  const navigate = useNavigate();

  function goToProcesses(): void {
    navigate('/my-processes', { replace: true });
  }

  return (
    <Portal>
      <MyFormView icon="/" title="Start process" description={name} backLabel="Back to processes" onBack={goToProcesses}>
        <MyProcessStartForm args={{ processName: name }} onEnded={goToProcesses} />
      </MyFormView>
    </Portal>
  );
}
