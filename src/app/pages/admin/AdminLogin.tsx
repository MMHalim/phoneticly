import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock } from 'lucide-react';
import { verifyAdminPassword } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { setAdminAuthed } from '../../../lib/admin-auth';
import { SetupNotice } from '../../components/SetupNotice';

export function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const configError = getSupabaseConfigError();

  async function handleLogin() {
    if (!password.trim() || configError) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const ok = await verifyAdminPassword(password);
      if (!ok) {
        setError('Incorrect password.');
        return;
      }
      setAdminAuthed(true);
      navigate('/admin', { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Unable to verify the admin password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl text-gray-900">Admin Access</h1>
            <p className="text-gray-600">Enter the admin password to continue</p>
          </div>

          {configError && <SetupNotice message={configError} />}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={() => void handleLogin()}
              disabled={!password.trim() || submitting || Boolean(configError)}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? 'Checking...' : 'Enter Admin'}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

