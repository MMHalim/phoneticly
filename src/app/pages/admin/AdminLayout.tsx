import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Users, BarChart3, ClipboardList, Home, Settings, LogOut } from 'lucide-react';
import { clearAdminAuthed } from '../../../lib/admin-auth';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/paragraphs', label: 'Paragraphs', icon: FileText },
    { path: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
    { path: '/admin/users', label: 'User Results', icon: Users },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Pronunciation Platform</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive(item.path)
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              clearAdminAuthed();
              navigate('/admin/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
