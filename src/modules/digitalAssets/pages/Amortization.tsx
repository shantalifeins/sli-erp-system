import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { TrendingDown, Search, ArrowRight, Loader2, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export default function Amortization() {
  const { getToken, permissions, dbUser } = useAuth();
  const currencySymbol = useCurrency();
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const canEdit = isSuperAdmin || permissions?.some((p: any) => p.module === 'Digital Amortization' && p.canEdit);

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [amortizations, setAmortizations] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [postForm, setPostForm] = useState({
    periodDate: new Date().toISOString().slice(0, 7) + '-01', // Default to 1st of current month
    amortizationAmount: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const assetsRes = await fetchWithAuth('/api/digital-assets', token);
      setAssets(Array.isArray(assetsRes) ? assetsRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAssetDetails = async (asset: any) => {
    setSelectedAsset(asset);
    setDetailsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetchWithAuth(`/api/digital-assets/${asset.id}`, token);
      setAmortizations(res.amortizations || []);
      
      // Pre-calculate amounts
      const cost = Number(asset.acquisitionCost || 0);
      const amortMonths = 12; // In a real app this would come from asset.amortizationMonths
      const defaultAmort = cost > 0 && amortMonths > 0 ? (cost / amortMonths).toFixed(2) : '';
      
      setPostForm({
        periodDate: new Date().toISOString().slice(0, 7) + '-01',
        amortizationAmount: defaultAmort
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePostAmortization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Calculate totals based on existing amortizations
      const currentAccumulated = amortizations.reduce((sum, a) => sum + Number(a.amortizationAmount), 0);
      const newAccumulated = currentAccumulated + Number(postForm.amortizationAmount);
      const bookValueAfter = Number(selectedAsset.acquisitionCost || 0) - newAccumulated;

      const res = await fetch(`/api/digital-assets/${selectedAsset.id}/amortize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          periodNumber: amortizations.length + 1,
          periodDate: postForm.periodDate,
          amortizationAmount: postForm.amortizationAmount,
          accumulatedAmortization: newAccumulated,
          bookValueAfter: bookValueAfter < 0 ? 0 : bookValueAfter
        })
      });

      if (!res.ok) throw new Error('Failed to post');
      await loadAssetDetails(selectedAsset);
    } catch (err) {
      console.error(err);
      alert('Error posting amortization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.assetCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 text-brand-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Amortization Schedule</h1>
          <p className="text-sm text-slate-500 font-medium">Post and track monthly amortization for digital assets</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Asset List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">No assets found</div>
              ) : (
                <div className="space-y-1">
                  {filteredAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => loadAssetDetails(asset)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group border ${selectedAsset?.id === asset.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div>
                        <h4 className={`font-bold text-sm ${selectedAsset?.id === asset.id ? 'text-brand-blue' : 'text-slate-800'}`}>{asset.name}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{asset.assetCode} • {currencySymbol}{Number(asset.acquisitionCost).toLocaleString()}</p>
                      </div>
                      <ArrowRight className={`w-4 h-4 ${selectedAsset?.id === asset.id ? 'text-brand-blue' : 'text-slate-300 group-hover:text-slate-400'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Amortization Details */}
        <div className="w-full lg:w-2/3">
          {selectedAsset ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedAsset.name}</h2>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm font-medium text-slate-500">Acquisition Cost: <strong className="text-slate-800">{currencySymbol}{Number(selectedAsset.acquisitionCost).toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col gap-8">
                {/* Form */}
                {canEdit && (
                  <form onSubmit={handlePostAmortization} className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Period Date</label>
                      <input
                        type="date"
                        required
                        value={postForm.periodDate}
                        onChange={e => setPostForm({ ...postForm, periodDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Amortization Amount</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-slate-500 font-bold sm:text-sm">{currencySymbol}</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={postForm.amortizationAmount}
                          onChange={e => setPostForm({ ...postForm, amortizationAmount: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Post Entry
                    </button>
                  </form>
                )}

                {/* Schedule Table */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-orange" />
                    Amortization Ledger
                  </h3>
                  
                  {detailsLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                  ) : amortizations.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <TrendingDown className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-600">No postings yet</p>
                      <p className="text-xs text-slate-500 mt-1">Amortization entries will appear here once posted.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Expense</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Accumulated</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Book Value</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {amortizations.map((amort, index) => (
                            <tr key={amort.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-700 text-sm">
                                  {new Date(amort.periodDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-bold text-right">
                                {currencySymbol}{Number(amort.amortizationAmount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 font-medium text-right">
                                {currencySymbol}{Number(amort.accumulatedAmortization).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-600 font-bold text-right">
                                {currencySymbol}{Number(amort.bookValueAfter).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Posted
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center text-slate-500 p-8 min-h-[400px]">
              <TrendingDown className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-base font-bold">Select an Asset</p>
              <p className="text-sm mt-1 text-center">Click on an asset from the list to view or post its amortization schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
