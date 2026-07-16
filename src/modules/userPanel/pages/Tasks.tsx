import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import PageLayout from '@/src/shared/components/PageLayout';
import {
  CheckCircle2, Clock, AlertCircle, RefreshCw, LayoutList, Star, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string | number;
  key: string;
  name: string;
  assigneeUid?: string;
  isGlobal: boolean;
  isActive?: boolean;
}

const statusIcon: Record<string, React.ReactNode> = {
  Pending: <Clock className="w-4 h-4 text-amber-500" />,
  Completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  Archived: <AlertCircle className="w-4 h-4 text-slate-400" />,
};

export default function UserPanelTasks() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Global' | 'Personal'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/user-panel/tasks', token);
      // API now returns only global tasks
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load user panel tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filtered = tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.name?.toLowerCase().includes(q) && !t.category?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <PageLayout search={{ placeholder: "Search tasks...", onSearch: setSearchQuery }}>
      {/* Header actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">Your personal and global task dashboard</p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#F37021] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Loading tasks...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm mt-1">Your tasks will appear here when assigned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div
              key={task.key}
              className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-[#F37021]/30 transition-all cursor-pointer group"
              onClick={() => task.referenceId && task.referenceType && navigate(`/inbox`)}
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                task.isGlobal ? 'bg-amber-50' : 'bg-blue-50'
              }`}>
                {task.isGlobal
                  ? <Globe className="w-5 h-5 text-amber-500" />
                  : <Star className="w-5 h-5 text-blue-500" />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{task.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    task.isGlobal
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {task.isGlobal ? 'Global' : 'Personal'}
                  </span>
                  {task.category && (
                    <span className="text-xs text-gray-400">{task.category}</span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                {task.status ? statusIcon[task.status] : statusIcon['Pending']}
                <span>{task.status || 'Active'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
