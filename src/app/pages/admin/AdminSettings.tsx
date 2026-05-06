import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { setAdminPassword } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

export function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const configError = getSupabaseConfigError();

  async function handleSave() {
    if (configError) {
      return;
    }

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setError('Fill in all password fields.');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const ok = await setAdminPassword(currentPassword, nextPassword);
      if (!ok) {
        setError('Current password is incorrect.');
        return;
      }
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setSuccess('Admin password updated.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update the password.'));
    } finally {
      setSaving(false);
    }
  }

  if (configError) {
    return (
      <div className="p-8">
        <SetupNotice message={configError} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900 mb-2">Admin Settings</h1>
        <p className="text-gray-600">Change the admin dashboard password.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <KeyRound className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-600">Use a strong password that you can remember.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Current password"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">New password</label>
          <input
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="New password"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Confirm new password"
          />
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving || !currentPassword || !nextPassword || !confirmPassword}
          className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Saving...' : 'Update Password'}
        </button>
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

