import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { deleteParagraph, getParagraphs, saveParagraph, type ParagraphRecord } from '../../../lib/app-data';
import { getSupabaseConfigError } from '../../../lib/supabase';
import { SetupNotice } from '../../components/SetupNotice';

interface Paragraph extends ParagraphRecord {
  assignedUsers: number;
}

export function ParagraphManagement() {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParagraph, setEditingParagraph] = useState<Paragraph | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const configError = getSupabaseConfigError();

  useEffect(() => {
    if (configError) {
      setLoading(false);
      return;
    }

    void loadParagraphs();
  }, [configError]);

  async function loadParagraphs() {
    try {
      setLoading(true);
      setError('');
      const rows = await getParagraphs();
      setParagraphs(rows);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load paragraphs.'));
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = () => {
    setEditingParagraph(null);
    setFormData({ title: '', content: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (paragraph: Paragraph) => {
    setEditingParagraph(paragraph);
    setFormData({ title: paragraph.title, content: paragraph.content });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setError('');
      await deleteParagraph(id);
      await loadParagraphs();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete the paragraph.'));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await saveParagraph({
        id: editingParagraph?.id,
        title: formData.title,
        content: formData.content,
      });
      setIsModalOpen(false);
      await loadParagraphs();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save the paragraph.'));
    } finally {
      setSaving(false);
    }
  };

  if (configError) {
    return (
      <div className="p-8">
        <SetupNotice message={configError} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Paragraph Management</h1>
          <p className="text-gray-600">Create and manage reading paragraphs</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Paragraph
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Title</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Content Preview</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Assigned Users</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Created</th>
              <th className="px-6 py-4 text-right text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-600">
                  Loading paragraphs...
                </td>
              </tr>
            ) : paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => (
                <tr key={paragraph.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-900">{paragraph.title}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-md truncate">
                    {paragraph.content}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {paragraph.assignedUsers} users
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(paragraph.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(paragraph)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(paragraph.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-600">
                  No paragraphs found yet. Add the first paragraph to start assigning content.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl text-gray-900">
                {editingParagraph ? 'Edit Paragraph' : 'Add New Paragraph'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter paragraph title"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Enter paragraph content"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={!formData.title || !formData.content || saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : editingParagraph ? 'Save Changes' : 'Add Paragraph'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
