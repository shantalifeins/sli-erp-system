import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { X, Send, Clock, CheckCircle2, User, Calendar, Edit3, Trash2, ArrowRight, RefreshCw, MessageSquare } from 'lucide-react';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TaskDetailPanel({ taskId, onClose, onUpdate }: TaskDetailPanelProps) {
  const { getToken, user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadTask = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth(`/api/todo/${taskId}`, token);
      setTask(data);
    } catch (err) {
      console.error('Failed to load task:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.comments]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth(`/api/todo/${taskId}/status`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      loadTask();
      onUpdate();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;
      
      await fetchWithAuth(`/api/todo/${taskId}/comments`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText })
      });
      
      setCommentText('');
      loadTask();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = await getToken();
      if (!token) return;
      
      await fetchWithAuth(`/api/todo/${taskId}`, token, { method: 'DELETE' });
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  if (!task && !loading) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-left border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              task?.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
              task?.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {task?.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> :
               task?.status === 'In Progress' ? <RefreshCw className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Detail</h2>
              <div className="text-sm font-semibold text-slate-700">{task?.status}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {task?.assignedByUid === user?.uid && (
              <button 
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-6 space-y-6 flex-1">
              
              {/* Title & Description */}
              <div>
                <h1 className="text-xl font-bold text-slate-800 mb-2">{task.title}</h1>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {task.description || <span className="italic text-slate-400">No description provided</span>}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Priority</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Assigned To</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    {task.assignedTo?.name || task.assignedTo?.email || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Start Date</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-400 uppercase mb-2">Change Status</span>
                <div className="flex gap-2">
                  {task.status !== 'To Do' && (
                    <button onClick={() => handleStatusChange('To Do')} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      Set To Do
                    </button>
                  )}
                  {task.status !== 'In Progress' && (
                    <button onClick={() => handleStatusChange('In Progress')} className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      In Progress
                    </button>
                  )}
                  {task.status !== 'Completed' && (
                    <button onClick={() => handleStatusChange('Completed')} className="flex-1 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="border-t border-slate-100 pt-6 mt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-orange" />
                  Comments ({task.comments?.length || 0})
                </h3>
                
                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {task.comments?.slice().reverse().map((c: any) => (
                    <div key={c.id} className={`flex gap-3 ${c.authorUid === user?.uid ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-xs flex-shrink-0 border border-orange-200">
                        {(c.author?.name || c.author?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className={`flex flex-col max-w-[75%] ${c.authorUid === user?.uid ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-700">{c.author?.name || c.author?.email || 'Unknown'}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className={`text-sm px-4 py-2 rounded-2xl ${
                          c.authorUid === user?.uid 
                            ? 'bg-brand-orange text-white rounded-tr-sm' 
                            : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                        }`}>
                          {c.body}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Type a comment..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="p-2 bg-brand-orange text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5 -ml-0.5" />
                </button>
              </form>
            </div>
            
          </div>
        )}
      </div>
    </>
  );
}

// Add this to your index.css or a global style block for the slide animation
// @keyframes slide-left {
//   from { transform: translateX(100%); }
//   to { transform: translateX(0); }
// }
// .animate-slide-left {
//   animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
// }
