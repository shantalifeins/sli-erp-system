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
  BarChart2,
  Globe,
  Monitor,
  Cpu,
  Key,
  Shield,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Server,
  Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#6366f1'];

export default function AssetDashboard() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const navigate = useNavigate();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const depPerms = permissions?.find((p: any) => p.module === 'Depreciation Schedule' || p.module === 'Assets Register') || {};
  const canRunDepr = isSuperAdmin || depPerms.canCreate || depPerms.canApprove;

  // Asset Nature State ('all' | 'fixed' | 'digital')
  const [assetNature, setAssetNature] = useState<'all' | 'fixed' | 'digital'>('all');

  // Shared Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCustodian, setSelectedCustodian] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Digital-Specific Filter States
  const [selectedDigitalType, setSelectedDigitalType] = useState('');
  const [selectedDigitalVendor, setSelectedDigitalVendor] = useState('');
  const [selectedDigitalExpiryWindow, setSelectedDigitalExpiryWindow] = useState('');
  const [selectedDigitalAutoRenewal, setSelectedDigitalAutoRenewal] = useState('');

  // Dropdown Metadata
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

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
      params.append('assetNature', assetNature);
      if (searchQuery) params.append('search', searchQuery);
      if (selectedBranch) params.append('branchId', selectedBranch);
      if (selectedLocation) params.append('locationId', selectedLocation);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedCustodian) params.append('custodianUid', selectedCustodian);
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      if (selectedYear) params.append('year', selectedYear);

      // Digital filters
      if (selectedDigitalType) params.append('digitalAssetType', selectedDigitalType);
      if (selectedDigitalVendor) params.append('digitalVendorId', selectedDigitalVendor);
      if (selectedDigitalExpiryWindow) params.append('digitalExpiryWindow', selectedDigitalExpiryWindow);
      if (selectedDigitalAutoRenewal) params.append('digitalAutoRenewal', selectedDigitalAutoRenewal);

      const [dashRes, branchRes, catRes, userRes, locRes, vendorRes, deptRes] = await Promise.all([
        fetchWithAuth(`/api/assets/dashboard?${params.toString()}`, token),
        fetchWithAuth('/api/branches', token).catch(() => ({ branches: [] })),
        fetchWithAuth('/api/assets/categories', token).catch(() => ({ categories: [] })),
        fetchWithAuth('/api/users', token).catch(() => ({ users: [] })),
        fetchWithAuth('/api/assets/locations', token).catch(() => ({ locations: [] })),
        fetchWithAuth('/api/vendors', token).catch(() => ({ vendors: [] })),
        fetchWithAuth('/api/departments', token).catch(() => ({ departments: [] }))
      ]);

      setDashboardData(dashRes);
      setBranchesList(branchRes.branches || branchRes || []);
      setCategoriesList(catRes.categories || []);
      setUsersList(Array.isArray(userRes) ? userRes : (userRes?.users || userRes?.data || []));
      setLocationsList(locRes.locations || []);
      setVendorsList(vendorRes.vendors || vendorRes || []);
      setDepartmentsList(deptRes.departments || deptRes || []);
    } catch (err) {
      console.error('Failed to load asset dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [
    getToken,
    assetNature,
    searchQuery,
    selectedBranch,
    selectedLocation,
    selectedCategory,
    selectedStatus,
    selectedCustodian,
    selectedDepartment,
    selectedYear,
    selectedDigitalType,
    selectedDigitalVendor,
    selectedDigitalExpiryWindow,
    selectedDigitalAutoRenewal
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('');
    setSelectedLocation('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedCustodian('');
    setSelectedDepartment('');
    setSelectedYear('');
    setSelectedDigitalType('');
    setSelectedDigitalVendor('');
    setSelectedDigitalExpiryWindow('');
    setSelectedDigitalAutoRenewal('');
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
  const recentDigitalAssets = dashboardData?.recentDigitalAssets || [];
  const upcomingRenewals = dashboardData?.upcomingRenewals || [];

  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 7 }, (_, i) => String(currentYear - i));

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedBranch ||
    selectedLocation ||
    selectedCategory ||
    selectedStatus ||
    selectedCustodian ||
    selectedDepartment ||
    selectedYear ||
    selectedDigitalType ||
    selectedDigitalVendor ||
    selectedDigitalExpiryWindow ||
    selectedDigitalAutoRenewal
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar with Segment Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-md shadow-purple-500/20">
            {assetNature === 'digital' ? (
              <Globe className="w-6 h-6" />
            ) : assetNature === 'fixed' ? (
              <Box className="w-6 h-6" />
            ) : (
              <Layers className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {assetNature === 'digital'
                  ? 'Digital Asset Analytics & Subscriptions'
                  : assetNature === 'fixed'
                  ? 'Fixed Asset Register & Valuation'
                  : 'Enterprise Asset Management Portfolio'}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {assetNature === 'digital'
                ? 'Track software licenses, SaaS subscriptions, cloud infrastructure, seat utilization, and upcoming renewals'
                : assetNature === 'fixed'
                ? 'Monitor physical asset register, capitalized costs, book values, depreciation, and branch locations'
                : 'Consolidated overview of both tangible Fixed Assets and intangible Digital Assets'}
            </p>
          </div>
        </div>

        {/* 3-Way Asset Nature Segment Control */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setAssetNature('all')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              assetNature === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>All Assets</span>
          </button>

          <button
            type="button"
            onClick={() => setAssetNature('fixed')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              assetNature === 'fixed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fixed Asset</span>
          </button>

          <button
            type="button"
            onClick={() => setAssetNature('digital')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              assetNature === 'digital'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-600" />
            <span>Digital Asset</span>
          </button>
        </div>

        {/* Action Buttons based on Nature */}
        <div className="flex flex-wrap items-center gap-2.5">
          {assetNature === 'digital' ? (
            <>
              <button
                onClick={() => navigate('/digital-assets/vault')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-xs"
              >
                <Key className="w-3.5 h-3.5 text-slate-600" />
                <span>License Vault</span>
              </button>
              <button
                onClick={() => navigate('/digital-assets/subscriptions')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Subscriptions</span>
              </button>
              <button
                onClick={() => navigate('/digital-assets')}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Digital Asset</span>
              </button>
            </>
          ) : (
            <>
              {canRunDepr && (
                <button
                  onClick={() => {
                    setComputeResult(null);
                    setShowDepModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Depreciation</span>
                </button>
              )}

              <button
                onClick={() => navigate('/asset-categories')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Categories ({categoriesList.length})</span>
              </button>

              <button
                onClick={() => navigate('/assets')}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Fixed Asset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Global Interactive Dynamic Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              assetNature === 'digital'
                ? 'Search license, code, software...'
                : 'Search code, name, serial...'
            }
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* DIGITAL-SPECIFIC FILTERS */}
          {assetNature === 'digital' ? (
            <>
              <select
                value={selectedDigitalType}
                onChange={(e) => setSelectedDigitalType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Asset Types</option>
                <option value="Software License">Software License</option>
                <option value="SaaS Subscription">SaaS Subscription</option>
                <option value="Cloud Service">Cloud Service</option>
                <option value="Domain/Hosting">Domain / Hosting</option>
                <option value="API Service">API Service</option>
                <option value="Security Certificate">Security Certificate</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={selectedDigitalVendor}
                onChange={(e) => setSelectedDigitalVendor(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Vendors / Publishers</option>
                {vendorsList.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>

              <select
                value={selectedDigitalExpiryWindow}
                onChange={(e) => setSelectedDigitalExpiryWindow(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Expiry Timelines</option>
                <option value="30">Expiring in 30 Days</option>
                <option value="60">Expiring in 60 Days</option>
                <option value="90">Expiring in 90 Days</option>
                <option value="expired">Already Expired</option>
              </select>

              <select
                value={selectedDigitalAutoRenewal}
                onChange={(e) => setSelectedDigitalAutoRenewal(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">Auto-Renewal (All)</option>
                <option value="true">Auto-Renew Enabled</option>
                <option value="false">Manual Renew Only</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Draft">Draft</option>
                <option value="Suspended">Suspended</option>
              </select>
            </>
          ) : (
            /* FIXED / ALL FILTERS */
            <>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Branches</option>
                {branchesList.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {assetNature === 'fixed' && (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="">All Asset Locations</option>
                  {locationsList.filter((l: any) => !selectedBranch || l.branchId === Number(selectedBranch)).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}

              {assetNature === 'fixed' && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Departments</option>
                {departmentsList.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                {assetNature === 'fixed' ? (
                  <>
                    <option value="UnderMaintenance">Under Maintenance</option>
                    <option value="Disposed">Disposed</option>
                  </>
                ) : (
                  <>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                  </>
                )}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Acquisition Years</option>
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          <select
            value={selectedCustodian}
            onChange={(e) => setSelectedCustodian(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Custodians</option>
            <option value="unassigned">Unassigned Only</option>
            {usersList.map((u: any) => (
              <option key={u.uid || u.id} value={u.uid || String(u.id)}>
                {u.name || u.email}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
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

      {/* Critical Renewal Alerts Banner (Merged from Digital Reports) */}
      {(upcomingRenewals.length > 0 && (assetNature === 'all' || assetNature === 'digital')) && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                {upcomingRenewals.filter((r: any) => r.daysRemaining <= 30).length} Digital Asset Renewal(s) Due Within 30 Days
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Review license expirations, recurring invoices, and seat continuity before services lapse.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/digital-assets/subscriptions')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm shadow-amber-600/20"
          >
            Manage Subscriptions
          </button>
        </div>
      )}

      {/* Draft Fixed Assets Banner Alert */}
      {(metrics.draftCount ?? 0) > 0 && (assetNature === 'all' || assetNature === 'fixed') && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-purple-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {metrics.draftCount} Draft Fixed Asset{metrics.draftCount > 1 ? 's' : ''} Pending Activation
              </p>
              <p className="text-xs text-purple-600">
                Draft assets do not calculate monthly depreciation schedules until activated.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="px-4 py-1.5 bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Review & Activate
          </button>
        </div>
      )}

      {/* KPI STAT CARDS GRID */}
      {assetNature === 'digital' ? (
        /* DIGITAL ASSETS KPI CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Digital Assets</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalAssetsCount ?? 0}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">{metrics.activeCount ?? 0} Active Subscriptions</p>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
              <Globe className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Digital Spend</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {currencySymbol}{Number(metrics.totalAcquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Recurring: {currencySymbol}{Number(metrics.totalRecurringCost || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">License Seats Deployed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.usedSeats ?? 0} / {metrics.totalSeats ?? 0}
              </h3>
              <p className="text-xs text-cyan-600 font-medium mt-1">
                {metrics.seatUtilizationRate ?? 0}% Seat Utilization
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expiring in 30 Days</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.expiringSoonCount ?? 0}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.expiredCount ?? 0} Expired | {metrics.autoRenewalCount ?? 0} Auto-Renew
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : assetNature === 'all' ? (
        /* UNIFIED ALL ASSETS KPI CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Asset Portfolio</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalAssetsCount ?? 0}</h3>
              <p className="text-xs text-purple-600 font-medium mt-1">
                {metrics.fixedCount ?? 0} Fixed | {metrics.digitalCount ?? 0} Digital
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Capitalized Value</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {currencySymbol}{Number(metrics.totalAcquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fixed: {currencySymbol}{Number(metrics.fixedCost || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Portfolio Value</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {currencySymbol}{Number(metrics.totalNetBookValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Depr. Balance + Digital Assets
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Deployed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.activeCount ?? 0}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Currently Operational</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Portfolio Alerts</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.totalAlertsCount ?? (
                  (metrics.warrantyAlertsCount || 0) + (metrics.maintenanceAlertsCount || 0) + (metrics.digitalExpiringSoonCount || 0)
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.warrantyAlertsCount || 0} War. | {metrics.maintenanceAlertsCount || 0} Maint. | {metrics.digitalExpiringSoonCount || 0} Digital
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : (
        /* FIXED ASSETS KPI CARDS (7 CARDS) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Fixed Assets</p>
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
      )}

      {/* DYNAMIC VISUAL CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {assetNature === 'digital' ? (
          /* DIGITAL CHARTS */
          <>
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-base font-bold text-slate-800">Digital Asset Type Breakdown</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Expenditure by Classification</span>
              </div>

              <div className="h-72 w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
                ) : !charts.typeDistribution || charts.typeDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No digital asset type data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.typeDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, 'Total Cost']} 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Bar dataKey="cost" name="Expenditure" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <PieIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">Vendor / Publisher Share</h2>
              </div>

              <div className="h-72 w-full flex flex-col items-center justify-center">
                {loading ? (
                  <div className="text-xs text-slate-400">Loading chart...</div>
                ) : !charts.vendorDistribution || charts.vendorDistribution.length === 0 ? (
                  <div className="text-xs text-slate-400">No vendor distribution data.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.vendorDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="cost"
                        nameKey="vendorName"
                      >
                        {charts.vendorDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-v-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString()}`, 'Spend']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        ) : assetNature === 'all' ? (
          /* UNIFIED CHARTS */
          <>
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-bold text-slate-800">Asset Nature & Valuation Comparison</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Fixed vs Digital Asset Portfolio</span>
              </div>

              <div className="h-72 w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
                ) : !charts.assetNatureDistribution || charts.assetNatureDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.assetNatureDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        formatter={(value: any) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']} 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="cost" name="Acquisition / Spend" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="nbv" name="Net Book / Active Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <PieIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-slate-800">Portfolio Nature Share</h2>
              </div>

              <div className="h-72 w-full flex flex-col items-center justify-center">
                {loading ? (
                  <div className="text-xs text-slate-400">Loading chart...</div>
                ) : !charts.assetNatureDistribution || charts.assetNatureDistribution.length === 0 ? (
                  <div className="text-xs text-slate-400">No distribution available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.assetNatureDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="cost"
                        nameKey="name"
                      >
                        {charts.assetNatureDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-n-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString()}`, 'Capital Value']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        ) : (
          /* FIXED ASSET CHARTS */
          <>
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
          </>
        )}
      </div>

      {/* UPCOMING DIGITAL RENEWALS TABLE (Merged from Digital Reports) */}
      {(assetNature === 'digital' || assetNature === 'all') && upcomingRenewals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-slate-800">Upcoming Renewals & Expiration Timeline</h2>
                <p className="text-xs text-slate-500">Subscriptions and licenses approaching renewal cut-off dates</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/digital-assets/subscriptions')}
              className="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1"
            >
              <span>Manage Subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Asset Code / Software</th>
                  <th className="px-6 py-3.5">Asset Type</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5 text-center">Expiry Date</th>
                  <th className="px-6 py-3.5 text-center">Timeline</th>
                  <th className="px-6 py-3.5 text-right">Renewal Cost ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-center">Auto-Renew</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingRenewals.slice(0, 8).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-xs font-mono text-cyan-600">{r.assetCode}</div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {r.assetType}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      {r.vendorName || 'Direct'}
                    </td>
                    <td className="px-6 py-3.5 text-center text-xs font-medium text-slate-800">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.daysRemaining < 0
                          ? 'bg-rose-100 text-rose-800'
                          : r.daysRemaining <= 30
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {r.daysRemaining < 0 ? 'Expired' : `${r.daysRemaining} Days Left`}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {currencySymbol}{Number(r.renewalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.autoRenewal ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.autoRenewal ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => navigate('/digital-assets/subscriptions')}
                        className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 ml-auto"
                      >
                        <span>Renew</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRANCH LOCATION VALUATION TABLE (Fixed Assets) */}
      {(assetNature === 'fixed' || assetNature === 'all') && branchSummary && branchSummary.length > 0 && (
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

      {/* FILTERED RECENT REGISTER TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              {assetNature === 'digital'
                ? 'Recently Registered Digital Assets'
                : assetNature === 'fixed'
                ? 'Recently Registered Fixed Assets'
                : 'Recently Registered Assets Portfolio'}
            </h2>
          </div>
          <button
            onClick={() => navigate(assetNature === 'digital' ? '/digital-assets' : '/assets')}
            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            <span>{assetNature === 'digital' ? 'View Digital Register' : 'View Full Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tag / Code</th>
                <th className="px-6 py-4">Asset Name</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">Department / Custodian</th>
                <th className="px-6 py-4 text-right">Cost ({currencySymbol})</th>
                <th className="px-6 py-4 text-center">Seats / Expiry</th>
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
              ) : (recentAssets.length === 0 && recentDigitalAssets.length === 0) ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No matching assets found for active filters.
                  </td>
                </tr>
              ) : (
                (assetNature === 'digital' ? recentDigitalAssets : recentAssets).map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-purple-600 text-xs">
                      {asset.assetCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{asset.name}</div>
                      {asset.serialNumber && <div className="text-xs text-slate-400">SN: {asset.serialNumber}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {asset.categoryName || asset.assetType || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">{asset.departmentName || asset.branchName || 'General'}</div>
                      <div className="text-slate-400">{asset.custodianName || 'Unassigned'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      {asset.totalSeats !== undefined ? (
                        <span className="font-medium text-slate-700">
                          {asset.usedSeats || 0} / {asset.totalSeats} Seats
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">
                          {asset.currentBookValue ? `${currencySymbol}${Number(asset.currentBookValue).toLocaleString()}` : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        asset.status === 'UnderMaintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        asset.status === 'Expired' || asset.status === 'Disposed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {asset.totalSeats !== undefined ? (
                        <button
                          onClick={() => navigate('/digital-assets')}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                          title="View Digital Asset"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/asset-schedule/${asset.id}`)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Depreciation Schedule"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      )}
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
