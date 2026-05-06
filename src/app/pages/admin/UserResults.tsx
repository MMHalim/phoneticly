import { useEffect, useState } from 'react';
import { Eye, X, TrendingUp, Target } from 'lucide-react';
import { getUserResultsData, type ReadingSessionRecord } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

export function UserResults() {
  const [results, setResults] = useState<ReadingSessionRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<ReadingSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const configError = getSupabaseConfigError();

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    void loadResults();
  }, [configError]);

  async function loadResults() {
    try {
      setLoading(true);
      setError('');
      const rows = await getUserResultsData();
      setResults(rows);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load user results.'));
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl text-gray-900 mb-2">User Results</h1>
        <p className="text-gray-600">View detailed pronunciation performance</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-600">User Name</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Date</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Score</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Accuracy</th>
              <th className="px-6 py-4 text-right text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-600">
                  Loading results...
                </td>
              </tr>
            ) : results.length > 0 ? (
              results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-900">{result.learner?.full_name || 'Unknown learner'}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(result.completed_at)}</td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{result.score} / {result.total_words}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${result.accuracy}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{result.accuracy}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setSelectedUser(result)}
                        className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-600">
                  No user sessions found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl text-gray-900">{selectedUser.learner?.full_name || 'Unknown learner'}</h2>
                <p className="text-sm text-gray-600">Session from {formatDate(selectedUser.completed_at)}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">Total Score</span>
                  </div>
                  <div className="text-2xl text-green-700">{selectedUser.score} / {selectedUser.total_words}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">Accuracy</span>
                  </div>
                  <div className="text-2xl text-blue-700">{selectedUser.accuracy}%</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-gray-900 mb-4">Pronunciation Issues Detected</h3>
                <div className="space-y-4">
                  {selectedUser.pronunciation_issue_summaries?.length ? (
                    selectedUser.pronunciation_issue_summaries.map((issue) => (
                      <div key={issue.id} className="border border-gray-200 rounded-xl p-4">
                        <h4 className="text-gray-900 mb-2">{issue.issue_label}</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {issue.affected_words.map((word) => (
                            <span
                              key={word}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="text-gray-700 mb-1">Suggestions:</p>
                          {issue.suggestions.map((suggestion, idx) => (
                            <div key={`${issue.id}-${idx}`} className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                      No issue summaries were stored for this session.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
