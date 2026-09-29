import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { FileSpreadsheet, Download, Loader2, PieChart, TrendingUp, AlertTriangle, Box, Clock } from 'lucide-react';

export default function DigitalAssetReports() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;
        const assetsRes = await fetchWithAuth('/api/digital-assets', token);
        const data = Array.isArray(assetsRes) ? assetsRes : [];
        setAssets(data);

        // Calculate upcoming renewals (next 30 days)
        const now = new Date();
        const thirtyDays = new Date(now.setDate(now.getDate() + 30));
        
        const upcoming = data.filter(a => {
          if (!a.expiryDate || a.status !== 'Active') return false;
          const exp = new Date(a.expiryDate);
          return exp <= thirtyDays && exp >= new Date();
        }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

        setUpcomingRenewals(upcoming);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  // Metrics
  const totalCost = assets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
  const activeAssets = assets.filter(a => a.status === 'Active').length;
  const expiredAssets = assets.filter(a => a.status === 'Expired').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Digital Asset Analytics</h1>
            <p className="text-sm text-slate-500 font-medium">Overview of costs, licenses, and upcoming renewals</p>
          </div>
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-brand-blue rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Spent</p>
            <h3 className="text-2xl font-black text-slate-900">{currencySymbol}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
        
        {/* Active Licenses */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Assets</p>
            <h3 className="text-2xl font-black text-slate-900">{activeAssets}</h3>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Tracked</p>
            <h3 className="text-2xl font-black text-slate-900">{assets.length}</h3>
          </div>
        </div>

        {/* Expired */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Expired</p>
            <h3 className="text-2xl font-black text-slate-900">{expiredAssets}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">Upcoming Renewals (30 Days)</h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-96">
            {upcomingRenewals.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <p className="text-sm font-medium">No renewals due in the next 30 days.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Asset</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingRenewals.map(a => (
                    <tr key={a.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 text-sm block">{a.name}</span>
                        <span className="text-xs text-slate-500">{a.assetType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-amber-600">
                          {new Date(a.expiryDate).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Asset Type Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-brand-blue" />
            <h2 className="text-base font-bold text-slate-800">Asset Type Breakdown</h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Count</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(
                  assets.reduce((acc: any, curr) => {
                    acc[curr.assetType] = acc[curr.assetType] || { count: 0, cost: 0 };
                    acc[curr.assetType].count += 1;
                    acc[curr.assetType].cost += Number(curr.acquisitionCost || 0);
                    return acc;
                  }, {})
                ).map(([type, stats]: any) => (
                  <tr key={type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-medium text-right">{stats.count}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-bold text-right">{currencySymbol}{stats.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
