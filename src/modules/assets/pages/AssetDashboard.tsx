import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Box, Layers, DollarSign, TrendingUp, AlertTriangle, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AssetDashboard() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;

        const [assetRes, catRes] = await Promise.all([
          fetchWithAuth('/api/assets?limit=10', token),
          fetchWithAuth('/api/assets/categories', token)
        ]);

        setAssets(assetRes.assets || []);
        setCategories(catRes.categories || []);
      } catch (err) {
        console.error('Failed to load asset dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [getToken]);

  const totalAssetsCount = assets.length;
  const totalCost = assets.reduce((acc, a) => acc + Number(a.acquisitionCost || 0), 0);
  const totalBookValue = assets.reduce((acc, a) => acc + Number(a.currentBookValue || 0), 0);
  const activeCount = assets.filter(a => a.status === 'Active').length;
  const maintenanceCount = assets.filter(a => a.status === 'UnderMaintenance').length;

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
            <p className="text-sm text-slate-500">Monitor fixed asset register, category breakdowns, and valuation health</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
      </div>

      {/* Recent Fixed Assets Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Cost ({currencySymbol})</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading dashboard...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No assets registered yet.
                  </td>
                </tr>
              ) : (
                assets.slice(0, 5).map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-purple-600 text-xs">
                      {asset.assetCode}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {asset.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {asset.categoryName || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {asset.branchName || 'HQ'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
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
  );
}
