import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mic } from 'lucide-react';
import { registerLearner } from '../../lib/app-data';
import { getSupabaseConfigError } from '../../lib/supabase';
import { SetupNotice } from '../components/SetupNotice';

export function LandingPage() {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const configError = getSupabaseConfigError();

  const handleStart = async () => {
    if (!name.trim() || configError) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const learner = await registerLearner(name);
      navigate('/reading/select', {
        state: {
          userName: learner.full_name,
          learnerId: learner.id,
        },
      });
    } catch (startError) {
      setError(getErrorMessage(startError, 'Unable to start the reading flow.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Mic className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl text-gray-900">Pronunciation Training</h1>
            <p className="text-gray-600">Improve your speaking skills with AI-powered feedback</p>
          </div>

          {configError && <SetupNotice message={configError} />}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleStart()}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={() => void handleStart()}
              disabled={!name.trim() || submitting || Boolean(configError)}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? 'Starting...' : 'Start Reading'}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Admin Dashboard →
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
