import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Building, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';

interface AssetRegisterItem {
  id: string;
  assetCode: string;
  name: string;
  categoryName: string;
  branchName: string;
  departmentName: string;
  custodianName: string;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  decliningRate?: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  status: string;
  sourceType: string;
  serialNumber?: string;
}

interface DepreciationScheduleItem {
  id: number;
  assetId: string;
  assetCode: string;
  assetName: string;
  categoryName: string;
  periodNumber: number;
  periodDate: string;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValueAfter: number;
  status: string;
}

interface DepreciationReportData {
  schedule: DepreciationScheduleItem[];
  summary: {
    totalPosted: string;
    totalScheduled: string;
    totalPeriods: number;
  };
}

interface ValuationData {
  totalAcquisitionCost: number;
  totalAccumulatedDepreciation: number;
  totalNetBookValue: number;
  categoryBreakdown: {
    categoryName: string;
    count: number;
    cost: number;
    accum: number;
    nbv: number;
  }[];
  branchBreakdown: {
    branchName: string;
    count: number;
    cost: number;
    nbv: number;
  }[];
}

export default function AssetReports() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [activeTab, setActiveTab] = useState<'register' | 'depreciation' | 'valuation'>('register');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [registerData, setRegisterData] = useState<AssetRegisterItem[]>([]);
  const [depreciationData, setDepreciationData] = useState<DepreciationReportData | null>(null);
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);

  const [viewAsset, setViewAsset] = useState<any>(null);
  const [viewDepr, setViewDepr] = useState<any>(null);

  // Fetch Categories for filter dropdown
  useEffect(() => {
    async function fetchCategories() {
      try {
        const token = await getToken();
        const data = await fetchWithAuth('/api/assets/categories', token);
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, [getToken]);

  // Fetch Report Data based on Active Tab
  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (activeTab === 'register') {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (statusFilter) params.append('status', statusFilter);
        if (selectedCategory) params.append('categoryId', selectedCategory);

        const data = await fetchWithAuth(`/api/assets/reports/register?${params.toString()}`, token);
        setRegisterData(data.register || []);
      } else if (activeTab === 'depreciation') {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (selectedCategory) params.append('categoryId', selectedCategory);

        const data = await fetchWithAuth(`/api/assets/reports/depreciation?${params.toString()}`, token);
        setDepreciationData(data);
      } else if (activeTab === 'valuation') {
        const data = await fetchWithAuth('/api/assets/reports/valuation', token);
        setValuationData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, selectedCategory, statusFilter]);

  // Export to CSV helper
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'register') {
      csvContent += 'Asset Code,Name,Category,Branch,Department,Custodian,Acquisition Date,Acquisition Cost,Salvage Value,Useful Life (Months),Accum. Depreciation,Net Book Value,Status\n';
      registerData.forEach(item => {
        csvContent += `"${item.assetCode}","${item.name}","${item.categoryName || ''}","${item.branchName || ''}","${item.departmentName || ''}","${item.custodianName || ''}","${item.acquisitionDate || ''}",${item.acquisitionCost},${item.salvageValue},${item.usefulLifeMonths},${item.accumulatedDepreciation},${item.currentBookValue},"${item.status}"\n`;
      });
    } else if (activeTab === 'depreciation') {
      csvContent += 'Asset Code,Asset Name,Category,Period No,Period Date,Depreciation Amount,Accum. Depreciation,Book Value After,Status\n';
      depreciationData.schedule.forEach(item => {
        csvContent += `"${item.assetCode || ''}","${item.assetName || ''}","${item.categoryName || ''}",${item.periodNumber},"${item.periodDate || ''}",${item.depreciationAmount},${item.accumulatedDepreciation},${item.bookValueAfter},"${item.status}"\n`;
      });
    } else if (activeTab === 'valuation' && valuationData) {
      csvContent += 'Category Breakdown\nCategory,Count,Acquisition Cost,Accum. Depreciation,Net Book Value\n';
      valuationData.byCategory.forEach(c => {
        csvContent += `"${c.categoryName}",${c.count},${c.cost},${c.accum},${c.nbv}\n`;
      });
      csvContent += '\nBranch Breakdown\nBranch,Count,Acquisition Cost,Net Book Value\n';
      valuationData.byBranch.forEach(b => {
        csvContent += `"${b.branchName}",${b.count},${b.cost},${b.nbv}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Asset_${activeTab.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Local Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/assets')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Assets"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-orange" />
              Asset Management Reports
            </h1>
            <p className="text-sm text-slate-500">
              Generate detailed asset register, depreciation schedules, and valuation breakdowns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-orange hover:bg-brand-orange/90 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl">
        <button
          onClick={() => setActiveTab('register')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'register'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Asset Register
        </button>
        <button
          onClick={() => setActiveTab('depreciation')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'depreciation'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Depreciation Schedule
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'valuation'
              ? 'border-brand-orange text-brand-orange'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Valuation Summary
        </button>
      </div>

      {/* Filter Bar (Register & Depreciation tabs) */}
      {activeTab !== 'valuation' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {activeTab === 'register' && (
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, name, serial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadReportData()}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
            )}

            {/* Category Filter */}
            <div className="w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
              >
                <option value="">All Statuses</option>
                {activeTab === 'register' ? (
                  <>
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="UnderMaintenance">Under Maintenance</option>
                    <option value="Disposed">Disposed</option>
                  </>
                ) : (
                  <>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Posted">Posted</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <button
            onClick={loadReportData}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: ASSET REGISTER */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method & Rate</th>
                  <th className="py-3 px-4">Branch / Dept</th>
                  <th className="py-3 px-4">Custodian</th>
                  <th className="py-3 px-4 text-right">Acq. Cost</th>
                  <th className="py-3 px-4 text-right">Accum. Depr.</th>
                  <th className="py-3 px-4 text-right">Net Book Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registerData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No matching asset records found.
                    </td>
                  </tr>
                ) : (
                  registerData.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-brand-orange">
                        {asset.assetCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {asset.name}
                        {asset.serialNumber && (
                          <span className="block text-xs text-slate-400 font-normal">
                            S/N: {asset.serialNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{asset.categoryName || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                        {asset.depreciationMethod === 'Declining Balance' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                            DB {Number(asset.decliningRate || 0) > 0 ? `(${asset.decliningRate}%)` : '(Auto)'}
                          </span>
                        ) : asset.depreciationMethod === 'None' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Non-Depr
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            Straight Line
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {asset.branchName || 'Head Office'}
                        {asset.departmentName && (
                          <span className="block text-xs text-slate-400">{asset.departmentName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{asset.custodianName || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {currencySymbol}{Number(asset.accumulatedDepreciation || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {currencySymbol}{Number(asset.currentBookValue || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                          asset.status === 'UnderMaintenance' ? 'bg-amber-100 text-amber-700' :
                          asset.status === 'Disposed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewAsset(asset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange rounded text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPRECIATION SCHEDULE REPORT */}
      {activeTab === 'depreciation' && depreciationData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Posted Depr.</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {currencySymbol}{Number(depreciationData.summary.totalPosted || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Scheduled Depr.</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {currencySymbol}{Number(depreciationData.summary.totalScheduled || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Periods</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {depreciationData.summary.totalPeriods}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Asset Code</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Period #</th>
                    <th className="py-3 px-4">Period Date</th>
                    <th className="py-3 px-4 text-right">Depreciation Amount</th>
                    <th className="py-3 px-4 text-right">Accum. Depr.</th>
                    <th className="py-3 px-4 text-right">Book Value After</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depreciationData.schedule.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No depreciation schedule entries found.
                      </td>
                    </tr>
                  ) : (
                    depreciationData.schedule.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-brand-orange">
                          {item.assetCode || '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.assetName || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{item.categoryName || '-'}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {item.periodNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.periodDate ? new Date(item.periodDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                          {currencySymbol}{Number(item.depreciationAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {currencySymbol}{Number(item.accumulatedDepreciation || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          {currencySymbol}{Number(item.bookValueAfter || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'Posted' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setViewDepr(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange rounded text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VALUATION SUMMARY */}
      {activeTab === 'valuation' && valuationData && (
        <div className="space-y-6">
          {/* Summary Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Fixed Assets</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {valuationData.summary.totalAssetsCount}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Acquisition Cost</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {currencySymbol}{Number(valuationData.summary.totalAcquisitionCost || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Accum. Depreciation</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {currencySymbol}{Number(valuationData.summary.totalAccumulatedDepreciation || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Net Book Value</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {currencySymbol}{Number(valuationData.summary.totalNetBookValue || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-brand-orange" />
                Valuation by Category
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Count</th>
                      <th className="py-2.5 px-3 text-right">Acq. Cost</th>
                      <th className="py-2.5 px-3 text-right">Accum. Depr.</th>
                      <th className="py-2.5 px-3 text-right">Net Book Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {valuationData.byCategory.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{cat.categoryName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{cat.count}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{currencySymbol}{Number(cat.cost).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{currencySymbol}{Number(cat.accum).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{currencySymbol}{Number(cat.nbv).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branch Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-orange" />
                Valuation by Branch / Location
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Branch Name</th>
                      <th className="py-2.5 px-3 text-center">Count</th>
                      <th className="py-2.5 px-3 text-right">Acq. Cost</th>
                      <th className="py-2.5 px-3 text-right">Net Book Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {valuationData.byBranch.map((br, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{br.branchName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{br.count}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{currencySymbol}{Number(br.cost).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{currencySymbol}{Number(br.nbv).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Detail View Modal */}
      {viewAsset && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  Asset Register Details: {viewAsset.name}
                </h3>
                <p className="text-xs text-brand-orange font-mono">Code: {viewAsset.assetCode}</p>
              </div>
              <button 
                onClick={() => setViewAsset(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Asset Name</span><span className="font-semibold text-slate-900">{viewAsset.name}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Asset Code</span><span className="font-semibold text-brand-orange font-mono">{viewAsset.assetCode}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Category</span><span className="font-semibold text-slate-800">{viewAsset.categoryName || 'Uncategorized'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Acquisition Date</span><span className="font-semibold text-slate-800">{viewAsset.acquisitionDate ? new Date(viewAsset.acquisitionDate).toLocaleDateString() : 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Acquisition Cost</span><span className="font-bold text-slate-900">{currencySymbol}{Number(viewAsset.acquisitionCost || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Salvage Value</span><span className="font-semibold text-slate-800">{currencySymbol}{Number(viewAsset.salvageValue || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Useful Life</span><span className="font-semibold text-slate-800">{viewAsset.usefulLifeMonths || 36} months</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Depreciation Method</span><span className="font-semibold text-slate-800">{viewAsset.depreciationMethod} {Number(viewAsset.decliningRate || 0) > 0 ? `(${viewAsset.decliningRate}%)` : ''}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Accum. Depreciation</span><span className="font-semibold text-slate-800">{currencySymbol}{Number(viewAsset.accumulatedDepreciation || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Net Book Value</span><span className="font-bold text-emerald-600 text-base">{currencySymbol}{Number(viewAsset.currentBookValue || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Branch / Dept</span><span className="font-semibold text-slate-800">{viewAsset.branchName || 'Head Office'} {viewAsset.departmentName ? `(${viewAsset.departmentName})` : ''}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Custodian</span><span className="font-semibold text-slate-800">{viewAsset.custodianName || 'Unassigned'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Serial Number</span><span className="font-semibold text-slate-800">{viewAsset.serialNumber || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Source</span><span className="font-semibold text-slate-800">{viewAsset.sourceType || 'Manual'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Status</span><span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">{viewAsset.status}</span></div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewAsset(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded shadow-sm hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Schedule Entry View Modal */}
      {viewDepr && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Depreciation Period #{viewDepr.periodNumber} Details
                </h3>
                <p className="text-xs text-brand-orange font-mono">Asset Code: {viewDepr.assetCode}</p>
              </div>
              <button 
                onClick={() => setViewDepr(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Asset Name</span><span className="font-semibold text-slate-900">{viewDepr.assetName}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Asset Code</span><span className="font-semibold text-brand-orange font-mono">{viewDepr.assetCode}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Category</span><span className="font-semibold text-slate-800">{viewDepr.categoryName || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Period Number</span><span className="font-bold text-slate-800">{viewDepr.periodNumber}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Period Date</span><span className="font-semibold text-slate-800">{viewDepr.periodDate ? new Date(viewDepr.periodDate).toLocaleDateString() : 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Period Depreciation</span><span className="font-bold text-slate-900">{currencySymbol}{Number(viewDepr.depreciationAmount || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Accumulated Depr.</span><span className="font-semibold text-slate-800">{currencySymbol}{Number(viewDepr.accumulatedDepreciation || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Book Value After</span><span className="font-bold text-emerald-600 text-base">{currencySymbol}{Number(viewDepr.bookValueAfter || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Status</span><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">{viewDepr.status}</span></div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewDepr(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded shadow-sm hover:bg-slate-900"
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
