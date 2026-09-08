import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { 
  Box, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Play 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AssetDashboard() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const navigate = useNavigate();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const depPerms = permissions?.find((p: any) => p.module === 'Depreciation Schedule' || p.module === 'Assets Register') || {};
  const canRunDepr = isSuperAdmin || depPerms.canCreate || depPerms.canApprove;

  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Depreciation Wizard State
  const [showDepModal, setShowDepModal] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [isComputing, setIsComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetRes, catRes, alertsRes] = await Promise.all([
        fetchWithAuth('/api/assets?limit=100', token),
        fetchWithAuth('/api/assets/categories', token),
        fetchWithAuth('/api/assets/reports/alerts', token).catch(() => null)
      ]);

      setAssets(assetRes.assets || []);
      setCategories(catRes.categories || []);
      if (alertsRes) setAlertsData(alertsRes);
    } catch (err) {
      console.error('Failed to load asset dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [getToken]);

  const totalAssetsCount = assets.length;
  const totalCost = assets.reduce((acc, a) => acc + Number(a.acquisitionCost || 0), 0);
  const totalBookValue = assets.reduce((acc, a) => acc + Number(a.currentBookValue || 0), 0);
  const activeCount = assets.filter(a => a.status === 'Active').length;
  const draftCount = assets.filter(a => a.status === 'Draft').length;
  const maintenanceCount = assets.filter(a => a.status === 'UnderMaintenance').length;

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

        <div className="flex items-center gap-3">
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
            <span>Categories ({categories.length})</span>
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

      {/* Draft Assets Alert Banner */}
      {draftCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {draftCount} Draft Asset{draftCount > 1 ? 's' : ''} Pending Activation
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

      {/* Stat Cards Grid (6 items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assets Registered</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAssetsCount}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">{activeCount} Active Assets</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Acquisition Cost</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {currencySymbol}{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Capitalized Value</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Book Value</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {currencySymbol}{totalBookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Current Depreciated Balance</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance & Repair</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{maintenanceCount}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Assets Servicing Needed</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Warranty Expiration Alerts Card */}
        <div 
          onClick={() => navigate('/asset-reports?tab=alerts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Warranty Alerts</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {alertsData?.summary?.totalWarrantyAlerts ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {alertsData?.summary?.expiredWarrantyCount ?? 0} Expired | {alertsData?.summary?.expiringSoonWarrantyCount ?? 0} Expiring Soon
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Maintenance Expiration Alerts Card */}
        <div 
          onClick={() => navigate('/asset-reports?tab=alerts')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Maintenance Alerts</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {alertsData?.summary?.totalMaintenanceAlerts ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {alertsData?.summary?.overdueMaintenanceCount ?? 0} Overdue | {alertsData?.summary?.dueSoonMaintenanceCount ?? 0} Due Soon
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Branch-Wise Summary Table */}
      {alertsData?.branchSummary && alertsData.branchSummary.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>🏢 Branch-Wise Asset & Valuation Summary</span>
            </h2>
            <button
              onClick={() => navigate('/asset-reports?tab=alerts')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
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
                  <th className="px-6 py-3.5 text-right">Total Cost ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-right">Net Book Value ({currencySymbol})</th>
                  <th className="px-6 py-3.5 text-center">Warranty Alerts</th>
                  <th className="px-6 py-3.5 text-center">Maint. Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertsData.branchSummary.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{b.branchName}</td>
                    <td className="px-6 py-3.5 text-center font-semibold">{b.totalAssets}</td>
                    <td className="px-6 py-3.5 text-right font-medium">{currencySymbol}{Number(b.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-600">{currencySymbol}{Number(b.totalNetBookValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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

      {/* Category Breakdown & Recent Register Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-800">Category Breakdown</h2>
          </div>
          
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No asset categories configured.</p>
            ) : (
              categories.slice(0, 5).map(cat => {
                const catAssets = assets.filter(a => a.categoryId === cat.id);
                const catCost = catAssets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
                const percentage = totalCost > 0 ? Math.round((catCost / totalCost) * 100) : 0;
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{cat.name} ({catAssets.length})</span>
                      <span className="text-slate-900">{currencySymbol}{catCost.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Fixed Assets Table (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Recently Registered Assets</h2>
            </div>
            <button
              onClick={() => navigate('/assets')}
              className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              <span>View All Register</span>
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
                  <th className="px-6 py-4">Cost ({currencySymbol})</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Loading dashboard...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No assets registered yet.
                    </td>
                  </tr>
                ) : (
                  assets.slice(0, 5).map((asset) => (
                    <tr 
                      key={asset.id} 
                      onClick={() => navigate(`/asset-schedule/${asset.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-purple-600 text-xs">
                        {asset.assetCode}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {asset.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {asset.categoryName || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          asset.status === 'UnderMaintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          asset.status === 'Disposed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
