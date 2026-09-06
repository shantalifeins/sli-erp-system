import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Trash2, Plus, Search, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AssetDisposal() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [disposalHistory, setDisposalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [disposalForm, setDisposalForm] = useState({
    assetId: '',
    disposalType: 'Sale',
    saleAmount: '0.00',
    disposalDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const assetsRes = await fetchWithAuth('/api/assets', token);
      setAssetsList(assetsRes.assets || []);
    } catch (err) {
      console.error('Failed to load assets for disposal', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadDisposalHistory = async (asset: any) => {
    try {
      setSelectedAsset(asset);
      const token = await getToken();
      if (!token) return;

      const res = await fetchWithAuth(`/api/assets/${asset.id}/disposals`, token);
      setDisposalHistory(res.disposals || []);
    } catch (err) {
      console.error('Failed to load asset disposal history', err);
    }
  };

  const handleDisposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const targetAssetId = disposalForm.assetId || selectedAsset?.id;
      if (!targetAssetId) {
        alert('Please select an asset');
        return;
      }

      await fetchWithAuth(`/api/assets/${targetAssetId}/disposal`, token, {
        method: 'POST',
        body: JSON.stringify(disposalForm)
      });

      setShowDisposalModal(false);
      setDisposalForm({
        assetId: '',
        disposalType: 'Sale',
        saleAmount: '0.00',
        disposalDate: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      await loadData();
      if (selectedAsset) {
        await loadDisposalHistory(selectedAsset);
      }
    } catch (err: any) {
      alert(`Error submitting disposal: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assetsList.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assetCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          {selectedAsset && (
            <button
              onClick={() => setSelectedAsset(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="w-7 h-7 text-rose-600" />
              Asset Disposal & Write-off
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Request asset sale, scrap, write-off, or donation with automatic net gain/loss computation and depreciation cancellation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDisposalModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Initiate Asset Disposal
          </button>
        </div>
      </div>

      {selectedAsset ? (
        /* Detailed Asset Disposal History */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{selectedAsset.assetCode}</div>
              <h2 className="text-xl font-bold text-slate-800">{selectedAsset.name}</h2>
              <div className="text-sm text-slate-500 mt-1">
                Book Value: <span className="font-semibold text-slate-700">{currencySymbol}{Number(selectedAsset.currentBookValue || 0).toLocaleString()}</span> |
                Status: <span className={`ml-1 font-semibold ${selectedAsset.status === 'Disposed' || selectedAsset.status === 'Sold' ? 'text-rose-600' : 'text-emerald-600'}`}>{selectedAsset.status}</span>
              </div>
            </div>
            {selectedAsset.status !== 'Disposed' && selectedAsset.status !== 'Sold' && (
              <button
                onClick={() => {
                  setDisposalForm(prev => ({ ...prev, assetId: selectedAsset.id }));
                  setShowDisposalModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Dispose this Asset
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
              Disposal & Write-off Records ({disposalHistory.length})
            </div>
            {disposalHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No disposal records found for this asset.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {disposalHistory.map((d: any) => {
                  const gainLossNum = Number(d.gainLoss || 0);
                  const isGain = gainLossNum >= 0;
                  return (
                    <div key={d.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-base">{d.disposalType} Request</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-4">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date: {new Date(d.disposalDate).toLocaleDateString()}</span>
                          <span>Book Value: {currencySymbol}{Number(d.bookValueAtDisposal).toLocaleString()}</span>
                          {d.disposalType === 'Sale' && <span>Sale Amount: {currencySymbol}{Number(d.saleAmount).toLocaleString()}</span>}
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className={`text-sm font-bold flex items-center justify-end gap-1 ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {isGain ? '+' : ''}{currencySymbol}{gainLossNum.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">Gain / (Loss)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Asset Summary Table */
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by code or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
                  <th className="p-3.5">Net Book Value</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading assets...</td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No assets found.</td>
                  </tr>
                ) : (
                  filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{asset.assetCode}</td>
                      <td className="p-3.5 font-medium text-slate-800">{asset.name}</td>
                      <td className="p-3.5 text-slate-600">{asset.categoryName || 'General'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          asset.status === 'Disposed' || asset.status === 'Sold' ? 'bg-rose-100 text-rose-700' :
                          asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{currencySymbol}{Number(asset.currentBookValue || 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => loadDisposalHistory(asset)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          View Disposals
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

      {/* Disposal Form Modal */}
      {showDisposalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Initiate Asset Disposal / Write-off
            </h3>

            <form onSubmit={handleDisposalSubmit} className="space-y-4">
              {!selectedAsset && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Asset</label>
                  <select
                    required
                    value={disposalForm.assetId}
                    onChange={e => setDisposalForm({ ...disposalForm, assetId: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="">Select an active asset...</option>
                    {assetsList.filter(a => a.status !== 'Disposed' && a.status !== 'Sold').map(a => (
                      <option key={a.id} value={a.id}>{a.assetCode} — {a.name} (NBV: {currencySymbol}{a.currentBookValue})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Disposal Method</label>
                <select
                  required
                  value={disposalForm.disposalType}
                  onChange={e => setDisposalForm({ ...disposalForm, disposalType: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                >
                  <option value="Sale">Sale (Outright Sale)</option>
                  <option value="Scrap">Scrap (Salvage Value)</option>
                  <option value="WriteOff">Write-Off (Lost/Damaged)</option>
                  <option value="Donation">Donation / CSR</option>
                </select>
              </div>

              {disposalForm.disposalType === 'Sale' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sale Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={disposalForm.saleAmount}
                    onChange={e => setDisposalForm({ ...disposalForm, saleAmount: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Effective Disposal Date</label>
                <input
                  type="date"
                  required
                  value={disposalForm.disposalDate}
                  onChange={e => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason & Remarks</label>
                <textarea
                  rows={3}
                  value={disposalForm.notes}
                  onChange={e => setDisposalForm({ ...disposalForm, notes: e.target.value })}
                  placeholder="Justification for asset disposal or write-off..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisposalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Disposal Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
