import { useState } from 'react';
import { Tag, X, Edit2, Trash2, Plus } from 'lucide-react';
import { useLabels } from '../../context/LabelContext';
import { Button } from './Button';

const LABEL_COLORS = [
  '#64748b', '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
];

export function LabelManager({ isOpen, onClose }) {
  const { labels, createLabel, updateLabel, deleteLabel } = useLabels();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setColor(LABEL_COLORS[0]);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingId) {
      await updateLabel(editingId, { name: name.trim(), color });
    } else {
      await createLabel(name.trim(), color);
    }
    resetForm();
  };

  const handleEdit = (label) => {
    setName(label.name);
    setColor(label.color);
    setEditingId(label.id);
    setIsCreating(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this label? It will be removed from all tasks.')) {
      await deleteLabel(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Labels
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List of labels */}
        {!isCreating && !editingId && (
          <>
            <div className="mb-4 max-h-60 overflow-y-auto space-y-2">
              {labels.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No labels created yet.
                </p>
              ) : (
                labels.map(label => (
                  <div key={label.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-sm font-medium">{label.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(label)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(label.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button className="w-full flex justify-center gap-2 mb-2" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4" />
              Create Label
            </Button>
          </>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Label Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urgent, Bug, Design"
                className="input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
