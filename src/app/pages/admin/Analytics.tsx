import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getAnalyticsData } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export function Analytics() {
  const [sessions, setSessions] = useState<Array<{ learner_id: string; accuracy: number; completed_at: string }>>([]);
  const [issues, setIssues] = useState<Array<{ issue_key: string; issue_label: string; issue_count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const configError = getSupabaseConfigError();

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    void loadAnalytics();
  }, [configError]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError('');
      const data = await getAnalyticsData();
      setSessions(data.sessions as Array<{ learner_id: string; accuracy: number; completed_at: string }>);
      setIssues(data.issues as Array<{ issue_key: string; issue_label: string; issue_count: number }>);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load analytics data.'));
    } finally {
      setLoading(false);
    }
  }

  const mistakeData = useMemo(() => {
    const grouped = issues.reduce<Record<string, { category: string; count: number }>>((acc, issue) => {
      if (!acc[issue.issue_key]) {
        acc[issue.issue_key] = { category: issue.issue_label, count: 0 };
      }
      acc[issue.issue_key].count += issue.issue_count || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [issues]);

  const performanceData = useMemo(() => {
    const grouped = sessions.reduce<Record<string, { date: string; total: number; count: number }>>((acc, session) => {
      const date = new Date(session.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      if (!acc[date]) {
        acc[date] = { date, total: 0, count: 0 };
      }
      acc[date].total += session.accuracy || 0;
      acc[date].count += 1;
      return acc;
    }, {});

    return Object.values(grouped).map((item) => ({
      date: item.date,
      avgScore: Math.round(item.total / item.count),
    }));
  }, [sessions]);

  const accuracyDistribution = useMemo(() => {
    const ranges = [
      { range: '90-100%', count: 0 },
      { range: '80-89%', count: 0 },
      { range: '70-79%', count: 0 },
      { range: '60-69%', count: 0 },
      { range: '<60%', count: 0 },
    ];

    sessions.forEach((session) => {
      if (session.accuracy >= 90) ranges[0].count += 1;
      else if (session.accuracy >= 80) ranges[1].count += 1;
      else if (session.accuracy >= 70) ranges[2].count += 1;
      else if (session.accuracy >= 60) ranges[3].count += 1;
      else ranges[4].count += 1;
    });

    return ranges;
  }, [sessions]);

  const accuracyDistributionData = useMemo(
    () => accuracyDistribution.filter((bucket) => bucket.count > 0),
    [accuracyDistribution],
  );

  const averageAccuracy = sessions.length
    ? Math.round(sessions.reduce((sum, session) => sum + (session.accuracy || 0), 0) / sessions.length)
    : 0;

  if (configError) {
    return (
      <div className="p-8">
        <SetupNotice message={configError} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track performance trends and common issues</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Loading analytics...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Most Common Pronunciation Mistakes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mistakeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Average Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Accuracy Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={accuracyDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, percent }) => {
                  if (!percent || percent <= 0) {
                    return null;
                  }
                  return `${range}: ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {accuracyDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {accuracyDistributionData.length === 0 && (
            <div className="mt-4 text-sm text-gray-600">
              No sessions available yet to calculate accuracy distribution.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Key Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
                <div className="text-2xl text-green-700">{sessions.length}</div>
              </div>
              <div className="text-sm text-green-600">Stored in Supabase</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Active Users</div>
                <div className="text-2xl text-blue-700">{new Set(sessions.map((session) => session.learner_id)).size}</div>
              </div>
              <div className="text-sm text-blue-600">Based on recorded sessions</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
                <div className="text-2xl text-purple-700">{accuracyDistribution[0].count + accuracyDistribution[1].count}</div>
              </div>
              <div className="text-sm text-purple-600">Sessions at 80%+ accuracy</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 mb-1">Average Accuracy</div>
                <div className="text-2xl text-orange-700">{averageAccuracy}%</div>
              </div>
              <div className="text-sm text-orange-600">Across all completed sessions</div>
            </div>
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
