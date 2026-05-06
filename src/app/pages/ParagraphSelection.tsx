import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { BookOpen, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { ensureLearnerAssignments, getAssignmentsForLearner, type ParagraphRecord } from '../../lib/app-data';
import { getSupabaseConfigError } from '../../lib/supabase';
import { SetupNotice } from '../components/SetupNotice';

type AssignmentRow = {
  id: string;
  paragraph_id: string;
  status: string;
  paragraph: ParagraphRecord;
};

export function ParagraphSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = location.state?.userName || 'Guest';
  const learnerId = location.state?.learnerId as string | undefined;

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const configError = getSupabaseConfigError();

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    if (!learnerId) {
      setLoading(false);
      setError('Learner not found. Go back and enter your name to start.');
      return;
    }

    void loadAssignments();
  }, [configError, learnerId]);

  const orderedAssignments = useMemo(() => {
    const weight: Record<string, number> = { in_progress: 0, assigned: 1, completed: 2, reassigned: 3 };
    return [...assignments].sort((a, b) => (weight[a.status] ?? 9) - (weight[b.status] ?? 9));
  }, [assignments]);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError('');
      await ensureLearnerAssignments(learnerId as string);
      const rows = await getAssignmentsForLearner(learnerId as string);
      setAssignments(rows as AssignmentRow[]);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load paragraphs.'));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl text-gray-900">Choose a paragraph, {userName}</h1>
              <p className="text-gray-600 mt-2">New paragraphs added by the admin will appear here automatically.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Logout
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600 mt-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading paragraphs...</span>
            </div>
          ) : orderedAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
              {orderedAssignments.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    navigate('/reading', {
                      state: {
                        userName,
                        learnerId,
                        paragraphId: item.paragraph_id,
                        assignmentId: item.id,
                        paragraphTitle: item.paragraph.title,
                      },
                    })
                  }
                  className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-green-50">
                        <BookOpen className="w-5 h-5 text-green-700" />
                      </div>
                      <div className="text-lg text-gray-900">{item.paragraph.title}</div>
                    </div>
                    <StatusPill status={item.status} />
                  </div>

                  <div className="mt-4 text-sm text-gray-700 leading-6 line-clamp-4">
                    {item.paragraph.content}
                  </div>

                  <div className="mt-5 text-sm text-green-700">
                    {item.status === 'in_progress' ? 'Resume reading →' : item.status === 'completed' ? 'Read again →' : 'Start reading →'}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-8 text-sm text-gray-600">No paragraphs are available yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completed
      </span>
    );
  }

  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
        <Clock3 className="w-3.5 h-3.5" />
        In progress
      </span>
    );
  }

  return <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">Assigned</span>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
