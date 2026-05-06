import { Navigate } from 'react-router';
import { isAdminAuthed } from '../../../lib/admin-auth';
import { AdminLayout } from './AdminLayout';

export function AdminGate() {
  if (!isAdminAuthed()) {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminLayout />;
}

