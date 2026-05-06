import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, FileText, TrendingUp, Award, Loader2 } from 'lucide-react';
import { getDashboardData, type DashboardActivity, type DashboardStats, type LearnerRecord } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

const defaultStats: DashboardStats = {
  totalUsers: 0,
  activeParagraphs: 0,
  avgAccuracy: 0,
  sessionsToday: 0,
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const configError = getSupabaseConfigError();

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [configError]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      const dashboardData = await getDashboardData();
      setStats(dashboardData.stats);
      setRecentActivity(dashboardData.recentActivity);
      setLearners(dashboardData.learners);

      if (dashboardData.learners[0]) {
        setSelectedLearnerId(dashboardData.learners[0].id);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load dashboard data.'));
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

  const statsConfig = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { label: 'Active Paragraphs', value: stats.activeParagraphs, icon: FileText, color: 'green' },
    { label: 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: TrendingUp, color: 'purple' },
    { label: 'Sessions Today', value: stats.sessionsToday, icon: Award, color: 'orange' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Monitor learner activity and quickly assign reading paragraphs.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="min-w-[260px]">
            <label className="block text-sm text-gray-700 mb-2">Learners who started reading</label>
            <select
              value={selectedLearnerId}
              onChange={(event) => setSelectedLearnerId(event.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select learner</option>
              {learners.map((learner) => (
                <option key={learner.id} value={learner.id}>
                  {learner.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate(`/admin/assignments${selectedLearnerId ? `?learner=${selectedLearnerId}` : ''}`)}
            disabled={!selectedLearnerId}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            Assign Paragraph
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading dashboard data...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsConfig.map((stat) => {
              const Icon = stat.icon;
              const colors = getColorClasses(stat.color);
              return (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${colors.bg} rounded-lg`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                  </div>
                  <div className="text-2xl text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1">{activity.user}</div>
                        <div className="text-sm text-gray-600">{activity.action}</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-sm">
                          <span className="text-gray-600">Score: </span>
                          <span className="text-green-600">{activity.score}</span>
                        </div>
                        <div className="text-sm text-gray-500">{activity.time}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm text-gray-600">No reading sessions have been completed yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getColorClasses(color: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  };

  return colors[color] || colors.blue;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
