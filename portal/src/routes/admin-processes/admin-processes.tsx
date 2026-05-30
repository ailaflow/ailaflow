import { Link } from 'react-router';
import { AdminPortalLayout } from '../../components/layouts/admin-portal-layout';

export function AdminProcesses() {
  return (
    <AdminPortalLayout>
      <div>PROCESSES</div>
      <Link to="/admin/create-processes">Create new process</Link>
    </AdminPortalLayout>
  );
}
