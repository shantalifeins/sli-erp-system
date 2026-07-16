import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { FileText, ShoppingCart, DollarSign, Users, AlertCircle, Clock, CheckCircle2, TrendingUp, BarChart2, Briefcase, Activity } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  metrics: {
    totalPrs: number;
    totalPos: number;
    totalVendors: number;
    totalSpend: number;
    totalPaid: number;
  };
  pendingActions: {
    prsPendingApproval: number;
    posPendingGrn: number;
    unpaidInvoices: number;
  };
  charts: {
    prStatusChartData: { name: string; value: number }[];
    prDeptChartData: { name: string; prs: number }[];
    poStatusChartData: { name: string; value: number }[];
    spendTimelineData: { name: string; spend: number }[];
  };
  recentActivities: {
    id: string;
    type: string;
    ref: string;
    action: string;
    date: string;
  }[];
}

export default function Dashboard() {
  const { dbUser, getToken } = useAuth();
  const navigate = useNavigate();
  const currencySymbol = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchWithAuth('/api/dashboard/procurement', token);
        setData(res);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [getToken]);

  const COLORS = ['#e06214', '#2c2c2b', '#627c54', '#3b82f6', '#8b5cf6', '#10b981', '#f43f5e'];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return currencySymbol + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8 flex flex-col h-full overflow-y-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-charcoal">Procurement Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, {dbUser?.email?.split('@')[0]}. Here is what's happening today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => navigate('/purchase-requisition')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total PRs</p>
            <h3 className="text-3xl font-extrabold text-brand-charcoal">{data?.metrics?.totalPrs || 0}</h3>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/po')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total POs</p>
            <h3 className="text-3xl font-extrabold text-brand-charcoal">{data?.metrics?.totalPos || 0}</h3>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/invoices-payments')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-brand-orange/30 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Spend</p>
            <h3 className="text-xl lg:text-2xl font-extrabold text-brand-charcoal">
              {formatCurrency(data?.metrics?.totalSpend || 0)}
            </h3>
          </div>
        </div>

        <div 
          onClick={() => navigate('/vendors')}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Vendors</p>
            <h3 className="text-3xl font-extrabold text-brand-charcoal">{data?.metrics?.totalVendors || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending Actions */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-brand-orange" />
            <h3 className="text-lg font-bold text-brand-charcoal">Action Items</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div 
              onClick={() => navigate('/inbox')}
              className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brand-orange" />
                <span className="font-semibold text-orange-900">PRs Pending Approval</span>
              </div>
              <span className="bg-brand-orange text-white text-sm font-bold px-3 py-1 rounded-full">
                {data?.pendingActions?.prsPendingApproval || 0}
              </span>
            </div>

            <div 
              onClick={() => navigate('/grn')}
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">POs Pending GRN</span>
              </div>
              <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                {data?.pendingActions?.posPendingGrn || 0}
              </span>
            </div>

            <div 
              onClick={() => navigate('/invoices-payments')}
              className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Unpaid Invoices</span>
              </div>
              <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                {data?.pendingActions?.unpaidInvoices || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-brand-charcoal" />
            <h3 className="text-lg font-bold text-brand-charcoal">Recent Activity</h3>
          </div>
          <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {data.recentActivities.map((act, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {act.type === 'PR' ? <FileText className="w-4 h-4" /> : 
                       act.type === 'PO' ? <ShoppingCart className="w-4 h-4" /> : 
                       act.type === 'Payment' ? <DollarSign className="w-4 h-4" /> : 
                       <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-brand-charcoal text-sm">{act.ref}</span>
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{act.type}</span>
                      </div>
                      <p className="text-sm text-slate-600">{act.action}</p>
                      <time className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(act.date), 'MMM d, yyyy h:mm a')}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spend Trend Area Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-brand-charcoal" />
            <h3 className="text-lg font-bold text-brand-charcoal">Spending Trend (PO Based)</h3>
          </div>
          <div className="h-72 w-full">
            {data?.charts?.spendTimelineData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.charts.spendTimelineData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e06214" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e06214" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `${currencySymbol}${(val/1000)}k`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <RechartsTooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Spend']}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="spend" stroke="#e06214" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No spend data available</div>
            )}
          </div>
        </div>

        {/* PR Status Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-brand-charcoal" />
            <h3 className="text-lg font-bold text-brand-charcoal">PRs by Status</h3>
          </div>
          <div className="h-72 w-full">
            {data?.charts?.prStatusChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.prStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.charts.prStatusChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [value, 'Requisitions']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No PR data available</div>
            )}
          </div>
        </div>

        {/* PO Status Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="w-5 h-5 text-brand-charcoal" />
            <h3 className="text-lg font-bold text-brand-charcoal">POs by Status</h3>
          </div>
          <div className="h-72 w-full">
            {data?.charts?.poStatusChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.poStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.charts.poStatusChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [value, 'Purchase Orders']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No PO data available</div>
            )}
          </div>
        </div>

        {/* PRs by Department Bar Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-brand-charcoal" />
            <h3 className="text-lg font-bold text-brand-charcoal">Requests by Department</h3>
          </div>
          <div className="h-72 w-full">
            {data?.charts?.prDeptChartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.prDeptChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <RechartsTooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="prs" name="Total PRs" fill="#2c2c2b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No department data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
