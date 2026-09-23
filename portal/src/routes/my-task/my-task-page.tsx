import { useNavigate, useParams, useSearchParams } from 'react-router';
import { MyFullscreenView } from '../../views/my-form/my-fullscreen-view';
import { MyFormView } from '../../views/my-form/my-form-view';
import { MyTaskForm } from '../common/my-form/my-task-form';
import { Portal } from '../common/portal';

export function MyTaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  if (!taskId) {
    throw new Error('Task id is required');
  }

  const [searchParams] = useSearchParams();
  const fullscreen = searchParams.get('fs') === '1';

  function goToTasks(): void {
    navigate('/my-tasks', { replace: true });
  }

  if (fullscreen) {
    return (
      <MyFullscreenView>
        <MyTaskForm args={{ taskId }} onSubmitted={goToTasks} />
      </MyFullscreenView>
    );
  }
  return (
    <Portal>
      <MyFormView icon="T" title="Fulfill task" backLabel="Back to tasks" onBack={goToTasks}>
        <MyTaskForm args={{ taskId }} onSubmitted={goToTasks} />
      </MyFormView>
    </Portal>
  );
}
