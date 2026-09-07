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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = await getToken();
        if (!token) return;
        const [result, assetsResult] = await Promise.all([
          fetchWithAuth('/api/user-panel/dashboard', token),
          fetchWithAuth('/api/assets/my-assets', token).catch(() => ({ assets: [] }))
        ]);
        setData(result);
        setMyAssets(assetsResult.assets || []);
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
