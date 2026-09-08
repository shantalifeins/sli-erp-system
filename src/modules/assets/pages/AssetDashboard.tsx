import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { 
  Box, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Play,
  Search,
  Filter,
  RotateCcw,
  Building2,
  User,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function AssetDashboard() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const navigate = useNavigate();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const depPerms = permissions?.find((p: any) => p.module === 'Depreciation Schedule' || p.module === 'Assets Register') || {};
  const canRunDepr = isSuperAdmin || depPerms.canCreate || depPerms.canApprove;

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustodian, setSelectedCustodian] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Dropdown Metadata
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Analytics Data State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Depreciation Execution Modal
  const [showDepModal, setShowDepModal] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [isComputing, setIsComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedBranch) params.append('branchId', selectedBranch);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedCustodian) params.append('custodianUid', selectedCustodian);
      if (selectedYear) params.append('year', selectedYear);

      const [dashRes, branchRes, catRes, userRes] = await Promise.all([
        fetchWithAuth(`/api/assets/dashboard?${params.toString()}`, token),
        fetchWithAuth('/api/branches', token).catch(() => ({ branches: [] })),
        fetchWithAuth('/api/assets/categories', token).catch(() => ({ categories: [] })),
        fetchWithAuth('/api/users', token).catch(() => ([]))
      ]);

      setDashboardData(dashRes);
      setBranchesList(branchRes.branches || branchRes || []);
      setCategoriesList(catRes.categories || []);
      setUsersList(Array.isArray(userRes) ? userRes : (userRes?.users || userRes?.data || []));
    } catch (err) {
      console.error('Failed to load asset dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [getToken, searchQuery, selectedBranch, selectedCategory, selectedStatus, selectedCustodian, selectedYear]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedCustodian('');
    setSelectedYear('');
  };

  const handleRunDepreciation = async () => {
    try {
      setIsComputing(true);
      setComputeResult(null);
      const token = await getToken();
      if (!token) return;

      const res = await fetchWithAuth('/api/assets/compute-depreciation', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate })
      });

      setComputeResult(res);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Compute depreciation error:', err);
      setComputeResult({ error: err.message || 'Failed to compute depreciation' });
    } finally {
      setIsComputing(false);
    }
  };

  const metrics = dashboardData?.metrics || {};
  const charts = dashboardData?.charts || {};
  const branchSummary = dashboardData?.branchSummary || [];
  const recentAssets = dashboardData?.recentAssets || [];

  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 7 }, (_, i) => String(currentYear - i));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Asset Management Overview</h1>
            <p className="text-sm text-slate-500">Monitor fixed asset register, category breakdowns, branch locations, and valuation health</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canRunDepr && (
            <button
              onClick={() => {
                setComputeResult(null);
                setShowDepModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
            >
              <Play className="w-4 h-4" />
              <span>Run Depreciation</span>
            </button>
          )}

          <button
            onClick={() => navigate('/asset-categories')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categoriesList.length})</span>
          </button>
          
          <button
            onClick={() => navigate('/assets')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Global Interactive Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter title, code, serial..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Branch Locations</option>
            {branchesList.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Categories</option>
            {categoriesList.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="UnderMaintenance">Under Maintenance</option>
            <option value="Draft">Draft</option>
            <option value="Disposed">Disposed</option>
          </select>

          <select
            value={selectedCustodian}
            onChange={(e) => setSelectedCustodian(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Custodians</option>
            <option value="unassigned">Unassigned Only</option>
            {usersList.map((u: any) => (
              <option key={u.uid || u.id} value={u.uid || String(u.id)}>
                {u.name || u.email}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Acquisition Years</option>
            {yearsOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {(searchQuery || selectedBranch || selectedCategory || selectedStatus || selectedCustodian || selectedYear) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 border border-rose-200"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Draft Assets Banner Alert */}
      {(metrics.draftCount ?? 0) > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {metrics.draftCount} Draft Asset{metrics.draftCount > 1 ? 's' : ''} Pending Activation
              </p>
              <p className="text-xs text-amber-600">
                Draft assets do not calculate monthly depreciation schedules until activated.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="px-4 py-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Review & Activate
          </button>
        </div>
      )}

      {/* KPI Stat Cards Grid (7 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assets Registered</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalAssetsCount ?? 0}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">{metrics.activeCount ?? 0} Active Assets</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Capitalized Cost</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {currencySymbol}{Number(metrics.totalAcquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Total Acquisition Cost</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Book Value</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {currencySymbol}{Number(metrics.totalNetBookValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Current Depreciated Balance</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Accumulated Depr.</p>
            <h3 className="text-2xl font-bold text-slate-700 mt-1">
              {currencySymbol}{Number(metrics.totalAccumulatedDepreciation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Total Depreciation Expensed</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance & Repair</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.maintenanceCount ?? 0}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Assets Servicing Needed</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/asset-reports?tab=alerts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Warranty Alerts</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {metrics.warrantyAlertsCount ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.expiredWarrantyCount ?? 0} Expired | {metrics.expiringSoonWarrantyCount ?? 0} Soon
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/asset-reports?tab=alerts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance Alerts</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {metrics.maintenanceAlertsCount ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.overdueMaintenanceCount ?? 0} Overdue | {metrics.dueSoonMaintenanceCount ?? 0} Due
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Valuation Comparison Bar Chart (Spans 2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-800">Branch Valuation & Asset Comparison</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Acquisition Cost vs Net Book Value</span>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : !charts.branchValuation || charts.branchValuation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No branch data available for current filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.branchValuation} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="cost" name="Acquisition Cost" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="nbv" name="Net Book Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Asset Distribution Donut Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieIcon className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-800">Category Distribution</h2>
          </div>

          <div className="h-72 w-full flex flex-col items-center justify-center">
            {loading ? (
              <div className="text-xs text-slate-400">Loading chart...</div>
            ) : !charts.categoryValuation || charts.categoryValuation.length === 0 ? (
              <div className="text-xs text-slate-400">No category breakdown available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryValuation}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="nbv"
                    nameKey="name"
                  >
                    {charts.categoryValuation.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString()}`, 'Net Book Value']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Branch-Wise Asset & Valuation Analytics Table */}
      {branchSummary && branchSummary.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>Branch Location Valuation & Alerts Table</span>
            </h2>
            <button
              onClick={() => navigate('/asset-reports?tab=alerts')}
              className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1"
            >
              <span>Detailed Alert Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Branch Location</th>
                  <th className="px-6 py-3.5 text-center">Total Assets</th>
                  <th className="px-6 py-3.5 text-right">Capitalized Cost ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-right">Accum. Depr. ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-right">Net Book Value ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-center">Warranty Alerts</th>
                  <th className="px-6 py-3.5 text-center">Maint. Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchSummary.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{b.branchName}</td>
                    <td className="px-6 py-3.5 text-center font-semibold">{b.count}</td>
                    <td className="px-6 py-3.5 text-right font-medium">{currencySymbol}{Number(b.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-right text-slate-500">{currencySymbol}{Number(b.accum).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-600">{currencySymbol}{Number(b.nbv).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-center">
                      {b.warrantyAlertsCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {b.warrantyAlertsCount}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {b.maintenanceAlertsCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          {b.maintenanceAlertsCount}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtered Recent Register Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Recently Registered Assets (Filtered)</h2>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            <span>View Full Register</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tag Code</th>
                <th className="px-6 py-4">Asset Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location / Custodian</th>
                <th className="px-6 py-4 text-right">Cost ({currencySymbol})</th>
                <th className="px-6 py-4 text-right">Current Value ({currencySymbol})</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Loading analytics data...
                  </td>
                </tr>
              ) : recentAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No matching assets found for active filters.
                  </td>
                </tr>
              ) : (
                recentAssets.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-purple-600 text-xs">
                      {asset.assetCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{asset.name}</div>
                      {asset.serialNumber && <div className="text-xs text-slate-400">SN: {asset.serialNumber}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {asset.categoryName || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">{asset.branchName || 'HQ'}</div>
                      <div className="text-slate-400">{asset.custodianName || 'Unassigned'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                      {currencySymbol}{Number(asset.currentBookValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        asset.status === 'UnderMaintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        asset.status === 'Disposed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/asset-schedule/${asset.id}`)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View Depreciation Schedule"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Depreciation Calculation Modal Wizard */}
      {showDepModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Depreciation Execution Wizard</h3>
                <p className="text-xs text-slate-500">Post scheduled depreciation periods up to target cut-off date</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cut-off Period Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {computeResult && (
                <div className={`p-4 rounded-xl text-xs space-y-1 ${
                  computeResult.error 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <p className="font-bold">
                    {computeResult.error ? 'Calculation Failed' : 'Depreciation Posted Successfully'}
                  </p>
                  <p>
                    {computeResult.error || (computeResult.postedCount ? `Posted ${computeResult.postedCount} due depreciation period(s).` : computeResult.message)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDepModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isComputing}
                onClick={handleRunDepreciation}
                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isComputing ? 'Computing...' : 'Execute Postings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
