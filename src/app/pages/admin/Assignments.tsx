import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClipboardList, Loader2 } from 'lucide-react';
import {
  assignParagraphsToLearner,
  ensureLearnerAssignments,
  getAssignmentsForLearner,
  getLearners,
  getParagraphs,
  type LearnerRecord,
  type ParagraphRecord,
} from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

interface ParagraphOption extends ParagraphRecord {
  assignedUsers: number;
}

export function Assignments() {
  const [searchParams] = useSearchParams();
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphOption[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState(searchParams.get('learner') || '');
  const [selectedParagraphIds, setSelectedParagraphIds] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<Array<{ id: string; paragraph_id: string; status: string; paragraph: ParagraphRecord }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const configError = getSupabaseConfigError();

  const selectedLearner = useMemo(
    () => learners.find((learner) => learner.id === selectedLearnerId) || null,
    [learners, selectedLearnerId],
  );

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    loadData();
  }, [configError]);

  useEffect(() => {
    if (!selectedLearnerId || configError) {
      setCurrentAssignments([]);
      setSelectedParagraphIds([]);
      return;
    }

    void loadLearnerAssignments(selectedLearnerId);
  }, [configError, selectedLearnerId]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [learnerRows, paragraphRows] = await Promise.all([getLearners(), getParagraphs()]);
      setLearners(learnerRows);
      setParagraphs(paragraphRows);

      if (!selectedLearnerId && learnerRows[0]) {
        setSelectedLearnerId(learnerRows[0].id);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load assignment data.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadLearnerAssignments(learnerId: string) {
    try {
      await ensureLearnerAssignments(learnerId);
      const assignments = await getAssignmentsForLearner(learnerId);
      setCurrentAssignments(assignments as Array<{ id: string; paragraph_id: string; status: string; paragraph: ParagraphRecord }>);
      setSelectedParagraphIds(assignments.map((row) => row.paragraph_id));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load learner assignments.'));
    }
  }

  async function handleAssign() {
    if (!selectedLearnerId || selectedParagraphIds.length === 0) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      await assignParagraphsToLearner(selectedLearnerId, selectedParagraphIds);
      setSuccessMessage('Updated assignments for the selected learner.');
      const paragraphRows = await getParagraphs();
      setParagraphs(paragraphRows);
      await loadLearnerAssignments(selectedLearnerId);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save assignments.'));
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
        <h1 className="text-3xl text-gray-900 mb-2">Assign Paragraphs</h1>
        <p className="text-gray-600">
          Select a learner, then assign one or more paragraphs they can choose from in the reading screen.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl text-gray-900">New Assignment</h2>
              <p className="text-sm text-gray-600">Choose a learner and one or more paragraphs.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading learners and paragraphs...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Learner</label>
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

              <div>
                <label className="block text-sm text-gray-700 mb-2">Paragraphs</label>
                <div className="space-y-2 max-h-[280px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {paragraphs.map((paragraph) => {
                    const checked = selectedParagraphIds.includes(paragraph.id);
                    return (
                      <label key={paragraph.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedParagraphIds, paragraph.id]
                              : selectedParagraphIds.filter((id) => id !== paragraph.id);
                            setSelectedParagraphIds(next);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-gray-900">{paragraph.title}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{paragraph.content}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAssign}
                disabled={!selectedLearnerId || selectedParagraphIds.length === 0 || saving}
                className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <ClipboardList className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl text-gray-900">Current Assignments</h2>
              <p className="text-sm text-gray-600">All paragraphs assigned to this learner.</p>
            </div>
          </div>

          {selectedLearner ? (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <div className="text-sm text-gray-500">Learner</div>
                <div className="text-gray-900">{selectedLearner.full_name}</div>
              </div>

              {currentAssignments.length > 0 ? (
                <div className="space-y-2">
                  {currentAssignments.map((row) => (
                    <div key={row.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-gray-900">{row.paragraph.title}</div>
                        <span className="inline-flex px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                          {row.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2 mt-2">{row.paragraph.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600">No assignments yet.</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Select a learner to see their current assignment.</div>
          )}
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
