import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { X, Save, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({ onClose, onSuccess }: CreateTaskModalProps) {
  const { getToken, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    assignedToUid: user?.uid || ''
  });

  useEffect(() => {
    async function loadUsers() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchWithAuth('/api/users', token);
        if (res && Array.isArray(res)) {
          setUsers(res);
        } else if (res && res.users) {
          setUsers(res.users);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    }
    loadUsers();
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const token = await getToken();
      if (!token) return;

      await fetchWithAuth('/api/todo', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      onSuccess();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Create New Task</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-100">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form id="create-task-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow"
                placeholder="E.g., Prepare monthly report"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow resize-none"
                placeholder="Task details and instructions..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow bg-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign To</label>
                <select
                  value={formData.assignedToUid}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedToUid: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow bg-white"
                >
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-shadow text-slate-700"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-task-form"
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
              isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-brand-orange hover:bg-orange-600'
            }`}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSubmitting ? 'Saving...' : 'Create Task'}
          </button>
        </div>

      </div>
    </div>
  );
}
