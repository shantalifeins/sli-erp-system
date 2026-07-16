import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Package, AlertTriangle, ArrowDownUp, Layers, TrendingUp, TrendingDown, Box, Truck, FileText } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

export default function InventoryDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await fetchWithAuth('/api/dashboard/inventory', token);
        setData(result);
      } catch (err) {
        console.error('Failed to load inventory dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>Failed to load dashboard data.</p>
      </div>
    );
  }

  const { metrics, requisitionMetrics, lowStockItems, charts, recentGrns, recentTransactions } = data;

  const metricCards = [
    {
      title: 'Total Items',
      value: metrics.totalItems,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/inventory-report'
    },
    {
      title: 'Total Stock Qty',
      value: metrics.totalStockQty?.toLocaleString(),
      icon: Layers,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/inventory-report'
    },
    {
      title: 'Low Stock Alerts',
      value: metrics.lowStockCount,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      link: '/inventory-report'
    },
    {
      title: 'Total Movements',
      value: metrics.totalMovements,
      icon: ArrowDownUp,
      color: 'from-violet-500 to-violet-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      link: '/inventory-report'
    },
    {
      title: 'Fixed Assets',
      value: metrics.totalFixedAssets || 0,
      icon: Box,
      color: 'from-fuchsia-500 to-fuchsia-600',
      bgLight: 'bg-fuchsia-50',
      textColor: 'text-fuchsia-600',
      link: '/inventory-report'
    },
  ];

  const requisitionCards = requisitionMetrics ? [
    {
      title: 'Total Requisitions',
      value: requisitionMetrics.total,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/requisition-report?status=All'
    },
    {
      title: 'Pending Requisitions',
      value: requisitionMetrics.pending,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      link: '/requisition-report?status=Pending'
    },
    {
      title: 'Approved',
      value: requisitionMetrics.approved,
      icon: Layers,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/requisition-report?status=Approved'
    },
    {
      title: 'Rejected',
      value: requisitionMetrics.rejected,
      icon: TrendingDown,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      link: '/requisition-report?status=Rejected'
    },
    {
      title: 'Draft',
      value: requisitionMetrics.draft,
      icon: Box,
      color: 'from-slate-500 to-slate-600',
      bgLight: 'bg-slate-50',
      textColor: 'text-slate-600',
      link: '/requisition-report?status=Draft'
    },
    {
      title: 'Fully Delivered',
      value: requisitionMetrics.fullyDelivered || 0,
      icon: Package,
      color: 'from-teal-500 to-teal-600',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      link: '/requisition-report?deliveryStatus=Fully Delivered'
    },
    {
      title: 'Partially Delivered',
      value: requisitionMetrics.partiallyDelivered || 0,
      icon: Truck,
      color: 'from-orange-500 to-orange-600',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/requisition-report?deliveryStatus=Partially Delivered'
    },
    {
      title: 'Not Delivered',
      value: requisitionMetrics.notDelivered || 0,
      icon: AlertTriangle,
      color: 'from-rose-500 to-rose-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      link: '/requisition-report?deliveryStatus=Not Delivered'
    }
  ] : [];

  const getTransactionBadgeClass = (type: string) => {
    switch (type) {
      case 'Stock In': return 'bg-blue-100 text-blue-700';
      case 'Stock Out': return 'bg-pink-100 text-pink-700';
      case 'GRN': return 'bg-emerald-100 text-emerald-700';
      case 'Issue': return 'bg-orange-100 text-orange-700';
      case 'Return': return 'bg-indigo-100 text-indigo-700';
      case 'Transfer': return 'bg-violet-100 text-violet-700';
      case 'Adjustment': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getGrnStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending QC': return 'bg-yellow-100 text-yellow-700';
      case 'QC Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Closed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of your inventory status and movements</p>
      </div>

      {/* Requisition Cards */}
      {requisitionCards.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Requisition Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {requisitionCards.map((card) => (
              <div 
                key={card.title} 
                onClick={() => navigate(card.link)}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-brand-orange/30 hover:ring-1 hover:ring-brand-orange/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`${card.bgLight} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
                    <card.icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-800 group-hover:text-brand-orange transition-colors">{card.value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">{card.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metric Cards (Inventory Summary) */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Inventory Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {metricCards.map((card) => (
            <div 
              key={card.title} 
              onClick={() => navigate(card.link)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-brand-orange/30 hover:ring-1 hover:ring-brand-orange/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.bgLight} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 group-hover:text-brand-orange transition-colors">{card.value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">{card.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Inventory by Category</h3>
          {charts.categoryChartData && charts.categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charts.categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="qty"
                  nameKey="name"
                  label={false}
                >
                  {charts.categoryChartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} units`, 'Quantity']} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No category data available</div>
          )}
        </div>

        {/* Low Stock Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Low Stock vs Reorder Level</h3>
          {charts.lowStockChartData && charts.lowStockChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.lowStockChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock" fill="#f97316" name="Current Stock" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reorderLevel" fill="#e2e8f0" name="Reorder Level" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No reorder data available</div>
          )}
        </div>
      </div>

      {/* Stock Movement Trend */}
      {charts.movementTrendData && charts.movementTrendData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Stock Movement Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.movementTrendData}>
              <defs>
                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="inbound" stroke="#10b981" fill="url(#inboundGrad)" name="Inbound" />
              <Area type="monotone" dataKey="outbound" stroke="#ef4444" fill="url(#outboundGrad)" name="Outbound" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Row: Low Stock Table + Recent GRNs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low Stock Alerts Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-700">Low Stock Alerts</h3>
            {lowStockItems.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {lowStockItems.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Item</th>
                    <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Stock</th>
                    <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Reorder</th>
                    <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item: any) => {
                    const isZero = (item.quantityInStock || 0) === 0;
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => navigate('/inventory')}
                        className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer group"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-700 text-xs">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.itemCode}</div>
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <span className={`font-bold text-xs ${isZero ? 'text-red-600' : 'text-orange-600'}`}>{item.quantityInStock}</span>
                        </td>
                        <td className="text-center px-4 py-2.5 text-xs text-slate-500">{item.reorderLevel}</td>
                        <td className="text-center px-4 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isZero ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isZero ? 'Out of Stock' : 'Low'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
                <div className="text-center">
                  <Box className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  All items sufficiently stocked
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent GRNs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-700">Recent Goods Receipts</h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {recentGrns && recentGrns.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">GRN #</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">PO #</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Vendor</th>
                    <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrns.map((g: any) => (
                    <tr 
                      key={g.id} 
                      onClick={() => navigate(g.status === 'Pending QC' ? '/qc' : '/grn')}
                      className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer group"
                    >
                      <td className="px-4 py-2.5 font-medium text-xs text-slate-700">{g.grnNumber}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{g.poNumber}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{g.vendorName}</td>
                      <td className="text-center px-4 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getGrnStatusBadge(g.status)}`}>{g.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
                <div className="text-center">
                  <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No recent GRNs
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Stock Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">Recent Stock Transactions</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {recentTransactions && recentTransactions.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Item</th>
                  <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Type</th>
                  <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Qty</th>
                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Reference</th>
                  <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t: any) => (
                  <tr 
                    key={t.id} 
                    onClick={() => navigate(['Stock In', 'GRN'].includes(t.type) ? '/stock-in' : '/stock-out')}
                    className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer group"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-xs text-slate-700">{t.itemName}</div>
                      <div className="text-[10px] text-slate-400">{t.itemCode}</div>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getTransactionBadgeClass(t.type)}`}>{t.type}</span>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className="text-xs font-bold text-slate-700">{t.quantity}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{t.referenceId || '—'}</td>
                    <td className="text-right px-4 py-2.5 text-xs text-slate-400">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
              <div className="text-center">
                <ArrowDownUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No stock transactions recorded yet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
