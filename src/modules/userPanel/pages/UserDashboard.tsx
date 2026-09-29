import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { FileText, AlertTriangle, Layers, TrendingDown, Box, Package, Truck, CheckCircle2, Clock, Inbox as InboxIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/src/shared/components/PageLayout';

export default function UserDashboard() {
  const { getToken, dbUser, user } = useAuth();
  const userName = dbUser?.email?.split('@')[0].toUpperCase() || user?.email?.split('@')[0].toUpperCase() || 'USER';
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [todoSummary, setTodoSummary] = useState<any>(null);
  const [recentTodos, setRecentTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = await getToken();
        if (!token) return;
        const [result, assetsResult, todoSummResult, todoRecentResult] = await Promise.all([
          fetchWithAuth('/api/user-panel/dashboard', token),
          fetchWithAuth('/api/assets/my-assets', token).catch(() => ({ assets: [] })),
          fetchWithAuth('/api/todo/summary', token).catch(() => null),
          fetchWithAuth('/api/todo?limit=5', token).catch(() => [])
        ]);
        setData(result);
        setMyAssets(assetsResult.assets || []);
        setTodoSummary(todoSummResult);
        setRecentTodos(Array.isArray(todoRecentResult) ? todoRecentResult : []);
      } catch (err) {
        console.error('Failed to load user dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [getToken]);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-[50vh] text-slate-500">
          <p>Failed to load dashboard data.</p>
        </div>
      </PageLayout>
    );
  }

  const { requisitionStatus, requisitionDelivery, inbox } = data;

  // Process Requisition Data
  const getReqCount = (status: string) => requisitionStatus.find((r: any) => r.status === status)?.count || 0;
  const getDeliveryCount = (status: string) => requisitionDelivery.find((r: any) => r.deliveryStatus === status)?.count || 0;
  
  const totalRequisitions = requisitionStatus.reduce((acc: number, curr: any) => acc + curr.count, 0);

  const requisitionCards = [
    {
      title: 'Total Requisitions',
      value: totalRequisitions,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/item-requisition'
    },
    {
      title: 'Pending Requisitions',
      value: getReqCount('Pending Approval'),
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      link: '/item-requisition'
    },
    {
      title: 'Approved',
      value: getReqCount('Approved'),
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/item-requisition'
    },
    {
      title: 'Rejected',
      value: getReqCount('Rejected'),
      icon: TrendingDown,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      link: '/item-requisition'
    },
    {
      title: 'Fully Delivered',
      value: getDeliveryCount('Fully Delivered'),
      icon: Package,
      color: 'from-teal-500 to-teal-600',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      link: '/item-requisition'
    },
    {
      title: 'Partially Delivered',
      value: getDeliveryCount('Partially Delivered'),
      icon: Truck,
      color: 'from-cyan-500 to-cyan-600',
      bgLight: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      link: '/item-requisition'
    },
  ];

  // Process Inbox Data
  const getInboxCount = (status: string, category?: string) => {
    return inbox
      .filter((i: any) => i.status === status && (!category || i.category === category))
      .reduce((acc: number, curr: any) => acc + curr.count, 0);
  };

  const inboxCards = [
    {
      title: 'Pending Tasks',
      value: getInboxCount('Pending'),
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      link: '/inbox'
    },
    {
      title: 'Completed Tasks',
      value: getInboxCount('Completed'),
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/inbox'
    },
    {
      title: 'Procurement Tasks',
      value: getInboxCount('Pending', 'Procurement'),
      icon: Box,
      color: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      link: '/inbox'
    },
    {
      title: 'Inventory Tasks',
      value: getInboxCount('Pending', 'Inventory'),
      icon: Layers,
      color: 'from-violet-500 to-violet-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      link: '/inbox'
    }
  ];

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome, {userName}!</h1>
            <p className="text-sm text-slate-500 mt-1">This is your personal dashboard for your requisitions and tasks</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Requisition Summary Section */}
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              My Requisitions Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {requisitionCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={index}
                    onClick={() => navigate(card.link)}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{card.title}</p>
                      <h3 className={`text-2xl font-bold ${card.textColor}`}>{card.value}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Inbox Summary Section */}
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <InboxIcon className="w-4 h-4 text-slate-400" />
              My Inbox Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {inboxCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={index}
                    onClick={() => navigate(card.link)}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{card.title}</p>
                      <h3 className={`text-2xl font-bold ${card.textColor}`}>{card.value}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          
          {/* To-Do Summary Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                My To-Do Tasks
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/my-tasks')} className="text-sm font-medium text-brand-orange hover:text-orange-700 transition-colors">
                  View All Tasks
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Total Tasks', value: todoSummary?.total || 0, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
                { label: 'To Do', value: todoSummary?.toDo || 0, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: 'In Progress', value: todoSummary?.inProgress || 0, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Completed', value: todoSummary?.completed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Overdue', value: todoSummary?.overdue || 0, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
              ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-xl border ${stat.bg} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => navigate('/my-tasks')}>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${stat.color}`}>{stat.label}</div>
                </div>
              ))}
            </div>

            {recentTodos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Task</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTodos.map((todo) => (
                      <tr key={todo.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{todo.title}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                            todo.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-200' :
                            todo.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                            'text-emerald-600 bg-emerald-50 border-emerald-200'
                          }`}>
                            {todo.priority}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                            todo.status === 'Completed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                            todo.status === 'In Progress' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                            'text-amber-600 bg-amber-50 border-amber-200'
                          }`}>
                            {todo.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => navigate('/my-tasks')} className="text-brand-orange hover:text-orange-700 font-semibold text-xs transition-colors">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-slate-400" />
              My Assigned Fixed Assets ({myAssets.length})
            </h2>
            {myAssets.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center text-slate-400 text-sm">
                No fixed assets currently assigned to your account.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Asset Tag</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Location</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono text-xs font-bold text-purple-600">
                            {asset.assetCode}
                          </td>
                          <td className="p-4 font-medium text-slate-900">
                            {asset.name}
                            {asset.serialNumber && (
                              <span className="block text-xs text-slate-400 font-normal">SN: {asset.serialNumber}</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">
                            {asset.categoryName || 'General'}
                          </td>
                          <td className="p-4 text-slate-600 text-xs">
                            {asset.branchName || 'HQ'}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {asset.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
