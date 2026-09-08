import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import {
  Wrench,
  Plus,
  Search,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Filter,
  Play
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AssetMaintenance() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'analytics'>('list');

  // Master Data State
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<{
    kpis: { totalSpend: number; completedCount: number; scheduledCount: number; overdueCount: number };
    monthlySpend: any[];
    spendByCategory: any[];
  }>({
    kpis: { totalSpend: 0, completedCount: 0, scheduledCount: 0, overdueCount: 0 },
    monthlySpend: [],
    spendByCategory: []
  });

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeMaintRecord, setActiveMaintRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [logForm, setLogForm] = useState({
    assetId: '',
    maintenanceType: 'Preventive',
    vendorId: '',
    cost: '0.00',
    scheduledDate: new Date().toISOString().slice(0, 10),
    recurrenceInterval: 'None',
    status: 'InProgress',
    notes: ''
  });

  const [completeForm, setCompleteForm] = useState({
    cost: '0.00',
    nextDueDate: '',
    notes: ''
  });

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, vendorsRes, branchesRes, categoriesRes] = await Promise.all([
        fetchWithAuth('/api/assets', token),
        fetchWithAuth('/api/vendors', token).catch(() => ({ vendors: [] })),
        fetchWithAuth('/api/branches', token).catch(() => ({ branches: [] })),
        fetchWithAuth('/api/assets/categories', token).catch(() => ({ categories: [] }))
      ]);

      setAssetsList(assetsRes.assets || []);
      setVendorsList(vendorsRes.vendors || vendorsRes || []);
      setBranchesList(branchesRes.branches || branchesRes || []);
      setCategoriesList(categoriesRes.categories || []);
    } catch (err) {
      console.error('Failed to load maintenance data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth();
      const startDate = new Date(y, m, 1).toISOString().slice(0, 10);
      const endDate = new Date(y, m + 1, 0).toISOString().slice(0, 10);

      let query = `/api/assets/maintenance/calendar?startDate=${startDate}&endDate=${endDate}`;
      if (selectedBranchId) query += `&branchId=${selectedBranchId}`;
      if (selectedCategoryId) query += `&categoryId=${selectedCategoryId}`;

      const res = await fetchWithAuth(query, token);
      setCalendarEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load calendar events', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      let query = `/api/assets/maintenance/analytics`;
      const params: string[] = [];
      if (selectedBranchId) params.push(`branchId=${selectedBranchId}`);
      if (selectedCategoryId) params.push(`categoryId=${selectedCategoryId}`);
      if (params.length) query += `?${params.join('&')}`;

      const res = await fetchWithAuth(query, token);
      setAnalyticsData(res);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') loadCalendarEvents();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, currentMonth, selectedBranchId, selectedCategoryId]);

  const loadMaintenanceHistory = async (asset: any) => {
    try {
      setSelectedAsset(asset);
      const token = await getToken();
      if (!token) return;

      const res = await fetchWithAuth(`/api/assets/${asset.id}/maintenance`, token);
      setMaintenanceHistory(res.maintenance || []);
    } catch (err) {
      console.error('Failed to load asset maintenance history', err);
    }
  };

  const handleStartInProgress = async (recordId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetchWithAuth(`/api/assets/maintenance/${recordId}/in-progress`, token, {
        method: 'PUT'
      });

      await loadMasterData();
      if (selectedAsset) await loadMaintenanceHistory(selectedAsset);
      if (activeTab === 'calendar') await loadCalendarEvents();
      if (activeTab === 'analytics') await loadAnalytics();
    } catch (err: any) {
      alert(`Error setting task to InProgress: ${err.message || err}`);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const targetAssetId = logForm.assetId || selectedAsset?.id;
      if (!targetAssetId) {
        alert('Please select an asset');
        return;
      }

      await fetchWithAuth(`/api/assets/${targetAssetId}/maintenance`, token, {
        method: 'POST',
        body: JSON.stringify(logForm)
      });

      setShowLogModal(false);
      setLogForm({
        assetId: '',
        maintenanceType: 'Preventive',
        vendorId: '',
        cost: '0.00',
        scheduledDate: new Date().toISOString().slice(0, 10),
        recurrenceInterval: 'None',
        status: 'InProgress',
        notes: ''
      });
      await loadMasterData();
      if (selectedAsset) await loadMaintenanceHistory(selectedAsset);
      if (activeTab === 'calendar') await loadCalendarEvents();
      if (activeTab === 'analytics') await loadAnalytics();
    } catch (err: any) {
      alert(`Error logging maintenance: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeMaintRecord) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      await fetchWithAuth(`/api/assets/maintenance/${activeMaintRecord.id}/complete`, token, {
        method: 'PUT',
        body: JSON.stringify(completeForm)
      });

      setShowCompleteModal(false);
      setActiveMaintRecord(null);
      await loadMasterData();
      if (selectedAsset) await loadMaintenanceHistory(selectedAsset);
      if (activeTab === 'calendar') await loadCalendarEvents();
      if (activeTab === 'analytics') await loadAnalytics();
    } catch (err: any) {
      alert(`Error completing maintenance: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const filteredAssets = useMemo(() => {
    return assetsList.filter(a => {
      const matchSearch =
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assetCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBranch = !selectedBranchId || String(a.branchId) === String(selectedBranchId);
      const matchCategory = !selectedCategoryId || String(a.categoryId) === String(selectedCategoryId);
      return matchSearch && matchBranch && matchCategory;
    });
  }, [assetsList, searchQuery, selectedBranchId, selectedCategoryId]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage);

  // Calendar Grid Generator
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: Date | null; events: any[] }> = [];

    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ date: null, events: [] });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      const dayEvents = calendarEvents.filter(ev => {
        const evDate = new Date(ev.scheduledDate);
        evDate.setHours(0, 0, 0, 0);
        return evDate.getTime() === dateObj.getTime();
      });

      days.push({ date: dateObj, events: dayEvents });
    }

    return days;
  }, [currentMonth, calendarEvents]);

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (selectedAsset ? setSelectedAsset(null) : navigate('/asset-dashboard'))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-7 h-7 text-brand-orange" />
              Asset Maintenance Scheduler
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Preventive service scheduler, recurring task automation, interactive calendar & cost analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogModal(true)}
            className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Task
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedAsset(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'list' ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Asset Maintenance List
          </button>
          <button
            onClick={() => {
              setActiveTab('calendar');
              setSelectedAsset(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'calendar' ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Maintenance Calendar
          </button>
          <button
            onClick={() => {
              setActiveTab('analytics');
              setSelectedAsset(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'analytics' ? 'bg-brand-orange text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Cost Analytics
          </button>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="">All Branches</option>
              {branchesList.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none"
            >
              <option value="">All Categories</option>
              {categoriesList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW OR SELECTED ASSET TIMELINE */}
      {activeTab === 'list' && (
        <>
          {selectedAsset ? (
            /* Asset History Timeline */
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{selectedAsset.assetCode}</div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedAsset.name}</h2>
                  <div className="text-sm text-slate-500 mt-1">
                    Category: <span className="font-medium text-slate-700">{selectedAsset.categoryName || 'General'}</span> |
                    Status:{' '}
                    <span
                      className={`ml-1 font-semibold ${
                        selectedAsset.status === 'UnderMaintenance' ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {selectedAsset.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setLogForm(prev => ({
                      ...prev,
                      assetId: selectedAsset.id,
                      maintenanceType: selectedAsset.defaultMaintenanceType || 'Preventive',
                      recurrenceInterval: selectedAsset.defaultMaintenanceInterval || 'None'
                    }));
                    setShowLogModal(true);
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  Schedule Task for Asset
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700 flex items-center justify-between">
                  <span>Maintenance History Timeline ({maintenanceHistory.length})</span>
                </div>
                {maintenanceHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No maintenance tasks recorded for this asset.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {maintenanceHistory.map((m: any) => {
                      const isOverdue = m.status !== 'Completed' && new Date(m.scheduledDate) < today;
                      return (
                        <div key={m.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-base">{m.maintenanceType} Maintenance</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  m.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : m.status === 'InProgress'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {m.status}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> OVERDUE
                                </span>
                              )}
                              {m.recurrenceInterval && m.recurrenceInterval !== 'None' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                  Recurrence: {m.recurrenceInterval}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5" /> Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}
                              </span>
                              {m.completedDate && (
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed: {new Date(m.completedDate).toLocaleDateString()}
                                </span>
                              )}
                              {m.vendorName && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3.5 h-3.5" /> Vendor: {m.vendorName}
                                </span>
                              )}
                            </div>
                            {m.notes && <p className="text-xs text-slate-600 italic mt-1">"{m.notes}"</p>}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right mr-2">
                              <div className="text-sm font-bold text-slate-800">
                                {currencySymbol}{Number(m.cost).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">Total Cost</div>
                            </div>

                            {m.status === 'Scheduled' && (
                              <button
                                onClick={() => handleStartInProgress(m.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" /> Start Task
                              </button>
                            )}

                            {m.status !== 'Completed' && (
                              <button
                                onClick={() => {
                                  setActiveMaintRecord(m);
                                  setCompleteForm({ cost: String(m.cost || '0.00'), nextDueDate: '', notes: '' });
                                  setShowCompleteModal(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Assets Grid Table */
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search assets by code or name..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                      <th className="p-3.5">Asset Code</th>
                      <th className="p-3.5">Asset Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Next Maintenance Due</th>
                      <th className="p-3.5">Acquisition Cost</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">Loading assets...</td>
                      </tr>
                    ) : paginatedAssets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">No assets found matching filters.</td>
                      </tr>
                    ) : (
                      paginatedAssets.map(asset => {
                        const isOverdue =
                          asset.nextMaintenanceDue &&
                          new Date(asset.nextMaintenanceDue) < today &&
                          asset.status !== 'UnderMaintenance';
                        return (
                          <tr key={asset.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{asset.assetCode}</td>
                            <td className="p-3.5 font-medium text-slate-800">{asset.name}</td>
                            <td className="p-3.5 text-slate-600">{asset.categoryName || 'General'}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  asset.status === 'UnderMaintenance'
                                    ? 'bg-amber-100 text-amber-700'
                                    : asset.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {asset.status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {asset.nextMaintenanceDue ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-700 text-xs">
                                    {new Date(asset.nextMaintenanceDue).toLocaleDateString()}
                                  </span>
                                  {isOverdue && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Not Scheduled</span>
                              )}
                            </td>
                            <td className="p-3.5 font-medium text-slate-700">
                              {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => loadMaintenanceHistory(asset)}
                                className="text-brand-orange hover:text-orange-600 text-xs font-semibold flex items-center gap-1 ml-auto"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                View History
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredAssets.length)}</span> of{' '}
                      <span className="font-medium">{filteredAssets.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-600 px-2 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          {/* Month Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200"
              >
                Today
              </button>
              <button
                onClick={() =>
                  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-500 text-xs uppercase border-b border-slate-200 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayItem, index) => {
              if (!dayItem.date) {
                return <div key={index} className="min-h-[110px] bg-slate-50/50 rounded-lg border border-transparent" />;
              }

              const isToday = dayItem.date.getTime() === today.getTime();

              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-1.5 rounded-lg border flex flex-col justify-start space-y-1 ${
                    isToday ? 'border-brand-orange bg-orange-50/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-right text-xs font-bold text-slate-600">
                    <span className={isToday ? 'bg-brand-orange text-white px-1.5 py-0.5 rounded-full' : ''}>
                      {dayItem.date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayItem.events.map(ev => {
                      const isEvOverdue = ev.status !== 'Completed' && new Date(ev.scheduledDate) < today;
                      return (
                        <div
                          key={ev.id}
                          className={`p-1.5 rounded text-[11px] border leading-tight ${
                            ev.status === 'Completed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : ev.status === 'InProgress'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : isEvOverdue
                              ? 'bg-red-50 border-red-200 text-red-800 font-bold'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          <div className="font-semibold truncate">{ev.assetName}</div>
                          <div className="text-[10px] opacity-80 flex items-center justify-between mt-0.5">
                            <span>{ev.maintenanceType}</span>
                            <span>{currencySymbol}{Number(ev.cost || 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COST ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Total Spend</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {currencySymbol}{analyticsData.kpis.totalSpend.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-orange-50 text-brand-orange rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Completed Tasks</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {analyticsData.kpis.completedCount}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Active / Scheduled</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {analyticsData.kpis.scheduledCount}
                </div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Overdue Tasks</div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {analyticsData.kpis.overdueCount}
                </div>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Spend Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-orange" />
                12-Month Maintenance Expenditure Trend
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.monthlySpend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString()}`, 'Spend']}
                    />
                    <Bar dataKey="amount" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spend by Category Pie Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800">Category Cost Share</h3>
              <div className="h-72 flex items-center justify-center">
                {analyticsData.spendByCategory.length === 0 ? (
                  <div className="text-xs text-slate-400">No completed cost data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.spendByCategory}
                        dataKey="amount"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.spendByCategory.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => `${currencySymbol}${Number(val).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log / Schedule Maintenance Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-brand-orange" />
              Schedule Maintenance Task
            </h3>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              {!selectedAsset && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Asset *</label>
                  <select
                    required
                    value={logForm.assetId}
                    onChange={e => {
                      const aId = e.target.value;
                      const selected = assetsList.find(a => a.id === aId);
                      setLogForm({
                        ...logForm,
                        assetId: aId,
                        maintenanceType: selected?.defaultMaintenanceType || 'Preventive',
                        recurrenceInterval: selected?.defaultMaintenanceInterval || 'None'
                      });
                    }}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="">Select an asset...</option>
                    {assetsList
                      .filter(a => a.status === 'Active' || a.status === 'Draft')
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.assetCode} — {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Maintenance Type *</label>
                  <select
                    required
                    value={logForm.maintenanceType}
                    onChange={e => setLogForm({ ...logForm, maintenanceType: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="Preventive">Preventive Maintenance</option>
                    <option value="Corrective">Corrective Maintenance / Repair</option>
                    <option value="Warranty">Warranty Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Status *</label>
                  <select
                    required
                    value={logForm.status}
                    onChange={e => setLogForm({ ...logForm, status: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="InProgress">InProgress (Set Asset UnderMaintenance)</option>
                    <option value="Scheduled">Scheduled (Future Task)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Service Provider / Vendor</label>
                  <select
                    value={logForm.vendorId}
                    onChange={e => setLogForm({ ...logForm, vendorId: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="">Select Vendor (Optional)</option>
                    {vendorsList.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Auto Recurrence Interval
                  </label>
                  <select
                    value={logForm.recurrenceInterval}
                    onChange={e => setLogForm({ ...logForm, recurrenceInterval: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="None">None (One-time Task)</option>
                    <option value="Monthly">Monthly (+1 Month)</option>
                    <option value="Quarterly">Quarterly (+3 Months)</option>
                    <option value="HalfYearly">HalfYearly (+6 Months)</option>
                    <option value="Annually">Annually (+1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Estimated Cost ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={logForm.cost}
                    onChange={e => setLogForm({ ...logForm, cost: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={logForm.scheduledDate}
                    onChange={e => setLogForm({ ...logForm, scheduledDate: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Task Instructions & Notes</label>
                <textarea
                  rows={3}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Preventive checklist or details about issue..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Schedule Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Maintenance Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Complete Maintenance Task
            </h3>

            {activeMaintRecord?.recurrenceInterval && activeMaintRecord.recurrenceInterval !== 'None' && (
              <div className="p-3 bg-purple-50 text-purple-800 text-xs rounded-lg border border-purple-200">
                ⚡ <strong>Auto-Recurrence Active:</strong> Completing this task will automatically generate the next scheduled service task ({activeMaintRecord.recurrenceInterval}) and set asset's next maintenance date.
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Final Actual Cost ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={completeForm.cost}
                  onChange={e => setCompleteForm({ ...completeForm, cost: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Manual Next Maintenance Due Date (Optional Override)
                </label>
                <input
                  type="date"
                  value={completeForm.nextDueDate}
                  onChange={e => setCompleteForm({ ...completeForm, nextDueDate: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Completion Summary / Notes</label>
                <textarea
                  rows={3}
                  value={completeForm.notes}
                  onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  placeholder="Summary of repairs completed or replacement parts used..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Complete & Restore Active Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
