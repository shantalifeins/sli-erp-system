import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Layers, Search, Calendar, CreditCard, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Subscriptions() {
  const { getToken, permissions, dbUser } = useAuth();
  const currencySymbol = useCurrency();
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const canEdit = isSuperAdmin || permissions?.some((p: any) => p.module === 'Digital Subscriptions' && p.canEdit);

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [renewForm, setRenewForm] = useState({
    renewalDate: new Date().toISOString().slice(0, 10),
    newExpiryDate: '',
    amount: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const assetsRes = await fetchWithAuth('/api/digital-assets', token);
      
      // Filter for renewable assets
      const renewable = (Array.isArray(assetsRes) ? assetsRes : []).filter(a => 
        a.assetType === 'SaaS Subscription' || 
        a.assetType === 'Domain/Hosting' || 
        a.assetType === 'Cloud Service' ||
        a.autoRenewal
      );
      setAssets(renewable);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRenewClick = (asset: any) => {
    setSelectedAsset(asset);
    
    // Auto-calculate next year's expiry
    const currentExpiry = new Date(asset.expiryDate || new Date());
    const nextYear = new Date(currentExpiry);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    setRenewForm({
      renewalDate: new Date().toISOString().slice(0, 10),
      newExpiryDate: nextYear.toISOString().slice(0, 10),
      amount: asset.acquisitionCost || '0',
      notes: ''
    });
    setShowRenewModal(true);
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/digital-assets/${selectedAsset.id}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(renewForm)
      });

      if (!res.ok) throw new Error('Failed to renew');
      await loadData();
      setShowRenewModal(false);
      setSelectedAsset(null);
    } catch (err) {
      console.error(err);
      alert('Error renewing asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (days: number | null) => {
    if (days === null) return 'text-slate-500';
    if (days < 0) return 'text-red-600 font-bold';
    if (days <= 30) return 'text-amber-600 font-bold';
    return 'text-emerald-600 font-bold';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Subscriptions & Renewals</h1>
            <p className="text-sm text-slate-500 font-medium">Track and manage upcoming digital subscriptions</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search subscriptions or vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Expires On</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Layers className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-sm font-medium">No subscriptions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const daysLeft = getDaysRemaining(asset.expiryDate);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{asset.name}</span>
                          <span className="text-xs text-slate-500 font-medium">{asset.assetType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{asset.vendorName || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-slate-900 font-semibold">
                            {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                          </span>
                          {daysLeft !== null && (
                            <span className={`text-xs ${getExpiryColor(daysLeft)} mt-0.5`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => handleRenewClick(asset)}
                            className="px-3 py-1.5 bg-blue-50 text-brand-blue hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Renew
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {showRenewModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-brand-blue" />
                Renew Subscription
              </h3>
            </div>
            
            <form onSubmit={handleRenewSubmit} className="p-4 sm:p-6 space-y-5">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-sm text-slate-600 mb-1">Asset</p>
                <p className="font-bold text-slate-900">{selectedAsset.name}</p>
                {selectedAsset.expiryDate && (
                  <p className="text-xs text-slate-500 mt-1">Current Expiry: {new Date(selectedAsset.expiryDate).toLocaleDateString()}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Renewal Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={renewForm.renewalDate}
                  onChange={e => setRenewForm({ ...renewForm, renewalDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">New Expiry Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={renewForm.newExpiryDate}
                  onChange={e => setRenewForm({ ...renewForm, newExpiryDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Renewal Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm font-bold">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={renewForm.amount}
                    onChange={e => setRenewForm({ ...renewForm, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                <textarea
                  value={renewForm.notes}
                  onChange={e => setRenewForm({ ...renewForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all min-h-[80px]"
                  placeholder="Any reference number or invoice note..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
