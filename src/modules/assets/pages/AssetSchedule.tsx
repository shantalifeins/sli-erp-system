import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  Box, 
  Layers,
  Building2,
  FileText
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  periodNumber: number;
  periodDate: string;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  bookValueAfter: string;
  status: 'Scheduled' | 'Posted' | 'Cancelled';
}

export default function AssetSchedule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [asset, setAsset] = useState<any>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) return;

        const [assetRes, scheduleRes] = await Promise.all([
          fetchWithAuth(`/api/assets?limit=500`, token),
          fetchWithAuth(`/api/assets/${id}/schedule`, token)
        ]);

        const matchedAsset = (assetRes.assets || []).find((a: any) => a.id === id);
        setAsset(matchedAsset || null);
        setSchedule(scheduleRes.schedule || []);
      } catch (err: any) {
        console.error('Failed to load asset schedule:', err);
        setError(err.message || 'Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, getToken]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center text-slate-500 py-12">
        Loading depreciation schedule...
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assets Register</span>
        </button>
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700">
          <p className="font-semibold">{error || 'Asset not found'}</p>
        </div>
      </div>
    );
  }

  const cost = Number(asset.acquisitionCost || 0);
  const salvage = Number(asset.salvageValue || 0);
  const depreciableAmount = Math.max(0, cost - salvage);
  const currentBook = Number(asset.currentBookValue || cost);
  const accumulated = Number(asset.accumulatedDepreciation || 0);
  const progressPercent = depreciableAmount > 0 ? Math.min(100, Math.round((accumulated / depreciableAmount) * 100)) : 0;

  const postedCount = schedule.filter(s => s.status === 'Posted').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/assets')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Asset Register"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-purple-100 text-purple-700">
                {asset.assetCode}
              </span>
              <h1 className="text-xl font-bold text-slate-900">{asset.name}</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Depreciation Schedule & Financial Valuation Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            asset.status === 'UnderMaintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            asset.status === 'Disposed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {asset.status}
          </span>
        </div>
      </div>

      {/* Asset Valuation Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Acquisition Cost</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {currencySymbol}{cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Salvage Target: {currencySymbol}{salvage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Current Net Book Value</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {currencySymbol}{currentBook.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Method: {asset.depreciationMethod || 'Straight Line'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Accumulated Depreciation</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {currencySymbol}{accumulated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{postedCount} of {schedule.length} Periods Posted</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Useful Life</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {asset.usefulLifeMonths || 36} Months
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Start: {asset.depreciationStartDate ? new Date(asset.depreciationStartDate).toLocaleDateString() : 'Not Set'}
          </p>
        </div>
      </div>

      {/* Amortization Progress Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-2">
        <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
          <span>Depreciation Amortization Progress</span>
          <span className="text-purple-600">{progressPercent}% Depreciated</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 pt-1">
          <span>Cost: {currencySymbol}{cost.toLocaleString()}</span>
          <span>Target Salvage: {currencySymbol}{salvage.toLocaleString()}</span>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-800">Month-by-Month Amortization Schedule</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {schedule.length} Periods
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Period #</th>
                <th className="px-6 py-4">Period Date</th>
                <th className="px-6 py-4">Depreciation Amount ({currencySymbol})</th>
                <th className="px-6 py-4">Accumulated ({currencySymbol})</th>
                <th className="px-6 py-4">Ending Book Value ({currencySymbol})</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No schedule generated yet. Click "Activate" on the asset in Register to generate schedule.
                  </td>
                </tr>
              ) : (
                schedule.map((item) => (
                  <tr 
                    key={item.id || item.periodNumber} 
                    className={`hover:bg-slate-50/80 transition-colors ${item.status === 'Posted' ? 'bg-purple-50/20' : ''}`}
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                      #{item.periodNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium">
                      {new Date(item.periodDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-600">
                      -{currencySymbol}{Number(item.depreciationAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-purple-600">
                      {currencySymbol}{Number(item.accumulatedDepreciation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {currencySymbol}{Number(item.bookValueAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'Posted' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.status === 'Posted' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                            Posted
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Scheduled
                          </>
                        )}
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
