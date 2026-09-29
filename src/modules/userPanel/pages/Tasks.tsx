import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import PageLayout from '@/src/shared/components/PageLayout';
import {
  CheckCircle2, Clock, AlertCircle, RefreshCw, LayoutList, Star, Globe,
  Plus, Calendar, Flag, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailPanel from './components/TaskDetailPanel';

export default function UserPanelTasks() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      
      const data = await fetchWithAuth(`/api/todo?${params.toString()}`, token);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter]);

  const filtered = tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-emerald-600';
      case 'In Progress': return 'text-blue-600';
      default: return 'text-amber-600';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate || status === 'Completed') return false;
    return new Date(dueDate) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <PageLayout search={{ placeholder: "Search tasks...", onSearch: setSearchQuery }}>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">To-Do List</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal and assigned tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
        >
          <option value="">All Statuses</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        
        <button
          onClick={loadTasks}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange transition-colors ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <LayoutList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">No tasks found</p>
          <p className="text-sm text-slate-500 mt-1">Create a new task to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task.id)}
              className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-brand-orange/30 transition-all cursor-pointer group"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {task.status === 'Completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : task.status === 'In Progress' ? (
                  <RefreshCw className="w-6 h-6 text-blue-500" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </h3>
                  {isOverdue(task.dueDate, task.status) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                      OVERDUE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span className={`px-2 py-0.5 rounded font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue(task.dueDate, task.status) ? 'text-rose-600 font-medium' : ''}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {(task.assignedTo?.name || task.assignedTo?.email) && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {task.assignedTo.name || task.assignedTo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            loadTasks();
          }} 
        />
      )}

      {selectedTask && (
        <TaskDetailPanel 
          taskId={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={loadTasks} 
        />
      )}
    </PageLayout>
  );
}
