import { useNavigate, useParams } from 'react-router-dom';
import { MyFormView } from '../../views/my-form/my-form-view';
import { MyTaskForm } from '../common/my-form/my-task-form';
import { Portal } from '../common/portal';

export function MyTaskPage() {
  const { taskId } = useParams();
  if (!taskId) {
    throw new Error('Task id is required');
  }

  const navigate = useNavigate();

  function goToTasks(): void {
    navigate('/my-tasks', { replace: true });
  }

  return (
    <Portal>
      <MyFormView icon="T" title="Fulfill task" backLabel="Back to tasks" onBack={goToTasks}>
        <MyTaskForm args={{ taskId }} onSubmitted={goToTasks} />
      </MyFormView>
    </Portal>
  );
}
