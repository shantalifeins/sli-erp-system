import React, { useEffect, useState } from 'react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Briefcase, CheckCircle2, Clock, ShieldAlert, ArrowLeft, DollarSign, Calendar, Eye, Activity } from 'lucide-react';

export default function AssetCapitalization() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'capitalized'>('pending');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const capPerms = permissions?.find((p: any) => p.module === 'Asset Capitalization') || {};
  const canApprove = isSuperAdmin || capPerms.canApprove;

  const loadAssets = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetchWithAuth('/api/assets', token);
      const list = Array.isArray(res) ? res : (res?.assets || []);
      setAssets(list);
    } catch (err) {
      console.error('Failed to load assets for capitalization:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [getToken]);

  const pendingAssets = assets.filter((a: any) => a.status === 'Draft' || !a.isCapitalized);
  const capitalizedAssets = assets.filter((a: any) => a.status === 'Active' || a.isCapitalized);

  const handleCapitalize = async (assetId: string) => {
    if (!canApprove) {
      alert('You do not have permission to approve asset capitalization.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetchWithAuth(`/api/assets/${assetId}/activate`, token, {
        method: 'POST',
      });
      if (res?.asset) {
        alert(`Asset ${res.asset.assetCode} successfully capitalized! ${res.scheduleCount} depreciation periods generated.`);
        setSelectedAsset(null);
        loadAssets();
      } else {
        alert(res?.error || 'Failed to capitalize asset');
      }
    } catch (err: any) {
      console.error('Capitalization error:', err);
      alert(err?.message || 'Error executing capitalization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Top Banner */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Asset Capitalization</h1>
                <p className="text-sm text-slate-500">Review, approve, and activate fixed assets for depreciation schedule generation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Capitalization</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingAssets.length}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assets waiting for approval</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capitalized & Active</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{capitalizedAssets.length}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assets with active schedules</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Cost</p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">
                {currencySymbol}{pendingAssets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0).toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Value awaiting capitalization</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending Requests ({pendingAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('capitalized')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'capitalized'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Capitalized Register ({capitalizedAssets.length})
          </button>
        </div>

        {/* Main Content Area */}
        {selectedAsset ? (
          /* Asset Capitalization Detail View */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <button
                onClick={() => setSelectedAsset(null)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Capitalization List
              </button>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                selectedAsset.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedAsset.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Asset Code</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{selectedAsset.assetCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Asset Name</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedAsset.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Category</p>
                <p className="text-slate-700 mt-1">{selectedAsset.categoryName || 'General'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Acquisition Cost</p>
                <p className="font-bold text-purple-700 text-lg mt-1">
                  {currencySymbol}{Number(selectedAsset.acquisitionCost || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" /> Depreciation Schedule Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Method:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedAsset.depreciationMethod || 'Straight Line'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Useful Life:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedAsset.usefulLifeMonths || 36} Months</span>
                </div>
                <div>
                  <span className="text-slate-500">Salvage Value:</span>{' '}
                  <span className="font-semibold text-slate-800">{currencySymbol}{Number(selectedAsset.salvageValue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {selectedAsset.status !== 'Active' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCapitalize(selectedAsset.id)}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Processing Capitalization...' : 'Approve & Capitalize Asset'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Assets Table View */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading asset capitalization records...</div>
            ) : (activeTab === 'pending' ? pendingAssets : capitalizedAssets).length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base">No assets found in this tab</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === 'pending' ? 'All fixed assets have been capitalized.' : 'No active capitalized assets registered yet.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs">
                    <th className="p-4 font-semibold">Asset Code</th>
                    <th className="p-4 font-semibold">Asset Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Acquisition Cost</th>
                    <th className="p-4 font-semibold">Method</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeTab === 'pending' ? pendingAssets : capitalizedAssets).map((asset: any) => (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-800">{asset.assetCode}</td>
                      <td className="p-4 font-medium text-slate-800">{asset.name}</td>
                      <td className="p-4 text-slate-600">{asset.categoryName || 'General'}</td>
                      <td className="p-4 font-bold text-purple-700">
                        {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-600">{asset.depreciationMethod || 'Straight Line'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          asset.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedAsset(asset)}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {asset.status === 'Active' ? 'View Details' : 'Review & Capitalize'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
