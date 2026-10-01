import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  Search, 
  Filter, 
  RotateCcw, 
  Printer, 
  Users, 
  Clock, 
  TrendingDown, 
  Layers, 
  Box, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  X, 
  Key, 
  Building2, 
  Calendar,
  ShieldCheck,
  RefreshCw,
  Globe
} from 'lucide-react';

export default function DigitalAssetReports() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [activeTab, setActiveTab] = useState<'register' | 'utilization' | 'renewals' | 'amortization'>('register');
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTimeline, setSelectedTimeline] = useState('all');

  // Quick Details Modal
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, vendorsRes, deptsRes] = await Promise.all([
        fetchWithAuth('/api/digital-assets', token),
        fetchWithAuth('/api/vendors', token).catch(() => ({ vendors: [] })),
        fetchWithAuth('/api/departments', token).catch(() => ({ departments: [] }))
      ]);

      setAssets(Array.isArray(assetsRes) ? assetsRes : []);
      setVendors(vendorsRes.vendors || vendorsRes || []);
      setDepartments(deptsRes.departments || deptsRes || []);
    } catch (err) {
      console.error('Failed to load digital asset report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedVendor('');
    setSelectedStatus('');
    setSelectedDepartment('');
    setSelectedTimeline('all');
  };

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          (a.name || '').toLowerCase().includes(q) ||
          (a.assetCode || '').toLowerCase().includes(q) ||
          (a.vendorName || '').toLowerCase().includes(q) ||
          (a.licenseType || '').toLowerCase().includes(q) ||
          (a.custodianName || '').toLowerCase().includes(q) ||
          (a.departmentName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Type filter
      if (selectedType && a.assetType !== selectedType) return false;

      // Vendor filter
      if (selectedVendor && String(a.vendorId) !== selectedVendor) return false;

      // Status filter
      if (selectedStatus && a.status !== selectedStatus) return false;

      // Department filter
      if (selectedDepartment && String(a.departmentId) !== selectedDepartment) return false;

      // Timeline filter
      if (selectedTimeline !== 'all' && a.expiryDate) {
        const expDate = new Date(a.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (selectedTimeline === 'expired' && diffDays >= 0) return false;
        if (selectedTimeline === '30' && (diffDays < 0 || diffDays > 30)) return false;
        if (selectedTimeline === '60' && (diffDays < 0 || diffDays > 60)) return false;
        if (selectedTimeline === '90' && (diffDays < 0 || diffDays > 90)) return false;
      }

      return true;
    });
  }, [assets, searchQuery, selectedType, selectedVendor, selectedStatus, selectedDepartment, selectedTimeline, today]);

  // Tab 2: Utilization Calculations
  const utilizationMetrics = useMemo(() => {
    let totalPurchased = 0;
    let totalAssigned = 0;
    let overallocatedCount = 0;

    for (const a of filteredAssets) {
      const seats = Number(a.totalSeats || 0);
      const used = Number(a.usedSeats || 0);
      totalPurchased += seats;
      totalAssigned += used;
      if (seats > 0 && used > seats) {
        overallocatedCount++;
      }
    }

    const overallRate = totalPurchased > 0 ? ((totalAssigned / totalPurchased) * 100).toFixed(1) : '0';
    return {
      totalPurchased,
      totalAssigned,
      available: Math.max(0, totalPurchased - totalAssigned),
      overallRate,
      overallocatedCount
    };
  }, [filteredAssets]);

  // Tab 3: Renewal Forecast Calculations
  const renewalForecast = useMemo(() => {
    let expiring30 = 0;
    let expiring60 = 0;
    let expiring90 = 0;
    let expired = 0;
    let annualRecurringTotal = 0;

    for (const a of filteredAssets) {
      annualRecurringTotal += Number(a.recurringCost || a.acquisitionCost || 0);
      if (a.expiryDate) {
        const expDate = new Date(a.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) expired++;
        else if (diffDays <= 30) expiring30++;
        else if (diffDays <= 60) expiring60++;
        else if (diffDays <= 90) expiring90++;
      }
    }

    return {
      expiring30,
      expiring60,
      expiring90,
      expired,
      annualRecurringTotal
    };
  }, [filteredAssets, today]);

  // Tab 4: Amortization Calculations
  const amortizationSummary = useMemo(() => {
    let totalPrepaidCapital = 0;
    let activeAmortAssets = 0;
    let monthlyRunRate = 0;

    for (const a of filteredAssets) {
      const cost = Number(a.acquisitionCost || 0);
      totalPrepaidCapital += cost;
      if (a.amortizationMonths && Number(a.amortizationMonths) > 0) {
        activeAmortAssets++;
        monthlyRunRate += cost / Number(a.amortizationMonths);
      }
    }

    return {
      totalPrepaidCapital,
      activeAmortAssets,
      monthlyRunRate
    };
  }, [filteredAssets]);

  // Export to CSV Function
  const exportToCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'register') {
      headers = ['Asset Code', 'Software Name', 'Type', 'Vendor', 'License Model', 'Total Seats', 'Used Seats', 'Cost (BDT)', 'Recurring Cost (BDT)', 'Billing Cycle', 'Activation Date', 'Expiry Date', 'Department', 'Custodian', 'Status'];
      rows = filteredAssets.map(a => [
        a.assetCode,
        a.name,
        a.assetType,
        a.vendorName || 'N/A',
        a.licenseType || 'N/A',
        a.totalSeats || 0,
        a.usedSeats || 0,
        a.acquisitionCost || 0,
        a.recurringCost || 0,
        a.billingCycle || 'N/A',
        a.activationDate ? new Date(a.activationDate).toLocaleDateString() : 'N/A',
        a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'N/A',
        a.departmentName || 'N/A',
        a.custodianName || 'N/A',
        a.status
      ]);
    } else if (activeTab === 'utilization') {
      headers = ['Asset Code', 'Software Name', 'License Model', 'Total Seats', 'Assigned Seats', 'Available Capacity', 'Utilization Rate %', 'Cost Per Seat (BDT)', 'Department', 'Status'];
      rows = filteredAssets.map(a => {
        const seats = Number(a.totalSeats || 0);
        const used = Number(a.usedSeats || 0);
        const cost = Number(a.acquisitionCost || 0);
        const costPerSeat = seats > 0 ? (cost / seats).toFixed(2) : '0';
        const rate = seats > 0 ? ((used / seats) * 100).toFixed(1) : '0';
        return [
          a.assetCode,
          a.name,
          a.licenseType || 'Subscription',
          seats,
          used,
          Math.max(0, seats - used),
          `${rate}%`,
          costPerSeat,
          a.departmentName || 'N/A',
          a.status
        ];
      });
    } else if (activeTab === 'renewals') {
      headers = ['Asset Code', 'Software Name', 'Vendor', 'Expiry Date', 'Days Remaining', 'Renewal Cost (BDT)', 'Billing Cycle', 'Auto-Renewal', 'Status'];
      rows = filteredAssets.map(a => {
        const expDate = a.expiryDate ? new Date(a.expiryDate) : null;
        const diffDays = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 'N/A';
        return [
          a.assetCode,
          a.name,
          a.vendorName || 'Direct',
          expDate ? expDate.toLocaleDateString() : 'N/A',
          diffDays,
          a.recurringCost || a.acquisitionCost || 0,
          a.billingCycle || 'N/A',
          a.autoRenewal ? 'Yes' : 'No',
          a.status
        ];
      });
    } else if (activeTab === 'amortization') {
      headers = ['Asset Code', 'Software Name', 'Total Cost (BDT)', 'Amortization Months', 'Est. Monthly Charge (BDT)', 'Accounting Treatment', 'Activation Date', 'Expiry Date', 'Status'];
      rows = filteredAssets.map(a => {
        const cost = Number(a.acquisitionCost || 0);
        const months = Number(a.amortizationMonths || 0);
        const monthly = months > 0 ? (cost / months).toFixed(2) : '0.00';
        return [
          a.assetCode,
          a.name,
          cost,
          months > 0 ? months : 'None',
          monthly,
          a.accountingTreatment || 'Prepaid',
          a.activationDate ? new Date(a.activationDate).toLocaleDateString() : 'N/A',
          a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'N/A',
          a.status
        ];
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `digital_assets_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedType ||
    selectedVendor ||
    selectedStatus ||
    selectedDepartment ||
    selectedTimeline !== 'all'
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Digital Asset Enterprise Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable reporting for software licenses, SaaS subscriptions, seat capacity, renewals, and amortization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            onClick={exportToCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'register'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Box className="w-4 h-4 text-cyan-600" />
          <span>Master Register Report</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600">
            {filteredAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('utilization')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'utilization'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Seat & License Utilization</span>
          {utilizationMetrics.overallocatedCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
              {utilizationMetrics.overallocatedCount} Risk
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('renewals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'renewals'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Renewal & Expiry Forecast</span>
          {renewalForecast.expiring30 > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold">
              {renewalForecast.expiring30} Due
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('amortization')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'amortization'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-purple-600" />
          <span>Amortization & Accounting</span>
        </button>
      </div>

      {/* Global Interactive Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search software, code, vendor, custodian..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
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
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d: any) => (
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
            <option value="Expired">Expired</option>
            <option value="Draft">Draft</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={selectedTimeline}
            onChange={(e) => setSelectedTimeline(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">All Expirations</option>
            <option value="30">Expiring in 30 Days</option>
            <option value="60">Expiring in 60 Days</option>
            <option value="90">Expiring in 90 Days</option>
            <option value="expired">Expired</option>
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

      {/* ─────────────────────────────────────────────────────────
          TAB 1: MASTER REGISTER REPORT
          ───────────────────────────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Filtered</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{filteredAssets.length} Assets</h3>
              </div>
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                <Box className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Acquisition Spend</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {currencySymbol}{filteredAssets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recurring Commitments</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {currencySymbol}{filteredAssets.reduce((sum, a) => sum + Number(a.recurringCost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Seats Deployed</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {filteredAssets.reduce((sum, a) => sum + Number(a.usedSeats || 0), 0)} / {filteredAssets.reduce((sum, a) => sum + Number(a.totalSeats || 0), 0)}
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Asset Code / Software</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Vendor</th>
                    <th className="px-5 py-3.5 text-center">License Model</th>
                    <th className="px-5 py-3.5 text-center">Seats (Used/Total)</th>
                    <th className="px-5 py-3.5 text-right">Cost ({currencySymbol})</th>
                    <th className="px-5 py-3.5 text-center">Expiry & Days</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                        <span>Loading digital asset reports...</span>
                      </td>
                    </tr>
                  ) : filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                        No matching digital assets found for current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(a => {
                      const expDate = a.expiryDate ? new Date(a.expiryDate) : null;
                      const diffDays = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{a.name}</div>
                            <div className="text-xs font-mono text-cyan-600">{a.assetCode}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                            {a.assetType}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-700">
                            {a.vendorName || 'Direct / Internal'}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {a.licenseType || 'Subscription'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs">
                            <span className="font-bold text-slate-800">
                              {a.usedSeats || 0} / {a.totalSeats || 1}
                            </span>
                            {a.totalSeats && a.totalSeats > 0 && (
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (a.usedSeats || 0) > a.totalSeats
                                      ? 'bg-rose-500'
                                      : ((a.usedSeats || 0) / a.totalSeats) >= 0.8
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (((a.usedSeats || 0) / a.totalSeats) * 100))}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                            {currencySymbol}{Number(a.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs">
                            {expDate ? (
                              <div>
                                <div className="font-medium text-slate-800">{expDate.toLocaleDateString()}</div>
                                <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  diffDays !== null && diffDays < 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : diffDays !== null && diffDays <= 30
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {diffDays !== null && diffDays < 0 ? 'Expired' : `${diffDays} Days Left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Perpetual</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-700">
                            <div>{a.departmentName || 'General'}</div>
                            <div className="text-slate-400 text-[11px]">{a.custodianName || 'Unassigned'}</div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              a.status === 'Expired' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              a.status === 'Draft' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedAsset(a)}
                              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          TAB 2: SEAT & LICENSE UTILIZATION REPORT
          ───────────────────────────────────────────────────────── */}
      {activeTab === 'utilization' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Purchased Seats</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{utilizationMetrics.totalPurchased} Seats</h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned / In-Use Seats</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{utilizationMetrics.totalAssigned} Seats</h3>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Buffer Capacity</p>
                <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{utilizationMetrics.available} Seats Free</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Utilization</p>
                <h3 className="text-xl font-bold text-cyan-600 mt-0.5">{utilizationMetrics.overallRate}%</h3>
              </div>
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {utilizationMetrics.overallocatedCount > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  {utilizationMetrics.overallocatedCount} Software License(s) are Over-Allocated!
                </p>
                <p className="text-xs text-rose-600">
                  Assigned user seats exceed purchased license capacity. Review seat grants to avoid publisher compliance audits.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Software / Service</th>
                    <th className="px-6 py-3.5">Vendor</th>
                    <th className="px-6 py-3.5 text-center">Purchased Seats</th>
                    <th className="px-6 py-3.5 text-center">Assigned Seats</th>
                    <th className="px-6 py-3.5 text-center">Available Free</th>
                    <th className="px-6 py-3.5">Seat Utilization Bar</th>
                    <th className="px-6 py-3.5 text-right">Cost Per Seat ({currencySymbol})</th>
                    <th className="px-6 py-3.5 text-center">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map(a => {
                    const total = Number(a.totalSeats || 0);
                    const used = Number(a.usedSeats || 0);
                    const free = Math.max(0, total - used);
                    const rate = total > 0 ? (used / total) * 100 : 0;
                    const cost = Number(a.acquisitionCost || 0);
                    const costPerSeat = total > 0 ? (cost / total).toFixed(2) : '0';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900">{a.name}</div>
                          <div className="text-xs font-mono text-cyan-600">{a.assetCode}</div>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-700">
                          {a.vendorName || 'Direct'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-900">
                          {total}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-900">
                          {used}
                        </td>
                        <td className="px-6 py-3.5 text-center font-semibold text-emerald-600">
                          {free}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rate > 100
                                    ? 'bg-rose-500'
                                    : rate >= 85
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {rate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                          {currencySymbol}{Number(costPerSeat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {rate > 100 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              Overallocated
                            </span>
                          ) : rate >= 85 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              Near Limit
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              Optimal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          TAB 3: RENEWAL & EXPIRY FORECAST REPORT
          ───────────────────────────────────────────────────────── */}
      {activeTab === 'renewals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expiring in 30 Days</p>
                <h3 className="text-xl font-bold text-rose-600 mt-0.5">{renewalForecast.expiring30} Contracts</h3>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expiring in 60 Days</p>
                <h3 className="text-xl font-bold text-amber-600 mt-0.5">{renewalForecast.expiring60} Contracts</h3>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Already Expired</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{renewalForecast.expired} Contracts</h3>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Recurring Impact</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {currencySymbol}{renewalForecast.annualRecurringTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Software / License Name</th>
                    <th className="px-6 py-3.5">Vendor / Publisher</th>
                    <th className="px-6 py-3.5 text-center">Expiry Date</th>
                    <th className="px-6 py-3.5 text-center">Countdown Timeline</th>
                    <th className="px-6 py-3.5 text-right">Renewal Cost ({currencySymbol})</th>
                    <th className="px-6 py-3.5 text-center">Billing Cycle</th>
                    <th className="px-6 py-3.5 text-center">Auto-Renewal</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets
                    .filter(a => a.expiryDate)
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                    .map(a => {
                      const expDate = new Date(a.expiryDate);
                      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-slate-900">{a.name}</div>
                            <div className="text-xs font-mono text-cyan-600">{a.assetCode}</div>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-700">
                            {a.vendorName || 'Direct'}
                          </td>
                          <td className="px-6 py-3.5 text-center font-medium text-slate-800 text-xs">
                            {expDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              diffDays < 0
                                ? 'bg-rose-100 text-rose-800'
                                : diffDays <= 30
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {diffDays < 0 ? 'Expired' : `${diffDays} Days Left`}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                            {currencySymbol}{Number(a.recurringCost || a.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-3.5 text-center text-xs text-slate-700">
                            {a.billingCycle || 'Annually'}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              a.autoRenewal ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {a.autoRenewal ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              a.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          TAB 4: AMORTIZATION & ACCOUNTING REPORT
          ───────────────────────────────────────────────────────── */}
      {activeTab === 'amortization' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Prepaid / Capital Cost</p>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {currencySymbol}{amortizationSummary.totalPrepaidCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Amortization Assets</p>
                <h3 className="text-xl font-bold text-indigo-600 mt-0.5">{amortizationSummary.activeAmortAssets} Assets</h3>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Est. Monthly Charge Rate</p>
                <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
                  {currencySymbol}{amortizationSummary.monthlyRunRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} / Mo
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Software / Asset Name</th>
                    <th className="px-6 py-3.5 text-center">Accounting Treatment</th>
                    <th className="px-6 py-3.5 text-right">Total Cost ({currencySymbol})</th>
                    <th className="px-6 py-3.5 text-center">Amortization Period</th>
                    <th className="px-6 py-3.5 text-right">Monthly Charge ({currencySymbol})</th>
                    <th className="px-6 py-3.5 text-center">Activation Date</th>
                    <th className="px-6 py-3.5 text-center">Expiry Date</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map(a => {
                    const cost = Number(a.acquisitionCost || 0);
                    const months = Number(a.amortizationMonths || 0);
                    const monthly = months > 0 ? (cost / months).toFixed(2) : '0.00';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900">{a.name}</div>
                          <div className="text-xs font-mono text-cyan-600">{a.assetCode}</div>
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {a.accountingTreatment || 'Prepaid Expense'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          {currencySymbol}{cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs font-semibold text-slate-700">
                          {months > 0 ? `${months} Months` : 'Direct Expensed'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold text-emerald-600">
                          {currencySymbol}{Number(monthly).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs text-slate-700">
                          {a.activationDate ? new Date(a.activationDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs text-slate-700">
                          {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'Perpetual'}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            a.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW DETAILS MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedAsset.name}</h3>
                  <p className="text-xs font-mono text-cyan-600">{selectedAsset.assetCode}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Asset Type</span>
                <span className="font-bold text-slate-800">{selectedAsset.assetType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">License Model</span>
                <span className="font-bold text-slate-800">{selectedAsset.licenseType || 'Subscription'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Vendor / Publisher</span>
                <span className="font-bold text-slate-800">{selectedAsset.vendorName || 'Direct'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-bold text-slate-800">{selectedAsset.departmentName || 'General'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Total Seats</span>
                <span className="font-bold text-slate-800">{selectedAsset.usedSeats || 0} / {selectedAsset.totalSeats || 1} Used</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Acquisition Cost</span>
                <span className="font-bold text-slate-800">{currencySymbol}{Number(selectedAsset.acquisitionCost || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Activation Date</span>
                <span className="font-bold text-slate-800">
                  {selectedAsset.activationDate ? new Date(selectedAsset.activationDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-medium">Expiry Date</span>
                <span className="font-bold text-slate-800">
                  {selectedAsset.expiryDate ? new Date(selectedAsset.expiryDate).toLocaleDateString() : 'Perpetual'}
                </span>
              </div>
            </div>

            {selectedAsset.portalUrl && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block font-medium">Portal / Dashboard Link</span>
                  <a
                    href={selectedAsset.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-cyan-600 hover:underline"
                  >
                    {selectedAsset.portalUrl}
                  </a>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            )}

            {selectedAsset.notes && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-400 block font-medium mb-1">Contract / License Notes</span>
                <p className="text-slate-700">{selectedAsset.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
