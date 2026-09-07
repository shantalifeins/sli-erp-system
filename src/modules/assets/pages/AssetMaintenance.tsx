import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Wrench, Plus, Search, ArrowLeft, CheckCircle2, Clock, Building, Calendar, AlertTriangle } from 'lucide-react';

export default function AssetMaintenance() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();

  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeMaintRecord, setActiveMaintRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [logForm, setLogForm] = useState({
    assetId: '',
    maintenanceType: 'Preventive',
    vendorId: '',
    cost: '0.00',
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const [completeForm, setCompleteForm] = useState({
    cost: '0.00',
    nextDueDate: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, vendorsRes] = await Promise.all([
        fetchWithAuth('/api/assets', token),
        fetchWithAuth('/api/vendors', token).catch(() => ({ vendors: [] }))
      ]);

      setAssetsList(assetsRes.assets || []);
      setVendorsList(vendorsRes.vendors || vendorsRes || []);
    } catch (err) {
      console.error('Failed to load maintenance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadMaintenanceHistory = async (asset: any) => {
    try {
      setSelectedAsset(asset);
      const token = await getToken();
      if (!token) return;

      const res = await fetchWithAuth(`/api/assets/${asset.id}/maintenance`, token);
      setMaintenanceHistory(res.maintenance || []);
    } catch (err) {
      console.error('Failed to load asset maintenance history', err);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const targetAssetId = logForm.assetId || selectedAsset?.id;
      if (!targetAssetId) {
        alert('Please select an asset');
        return;
      }

      await fetchWithAuth(`/api/assets/${targetAssetId}/maintenance`, token, {
        method: 'POST',
        body: JSON.stringify(logForm)
      });

      setShowLogModal(false);
      setLogForm({
        assetId: '',
        maintenanceType: 'Preventive',
        vendorId: '',
        cost: '0.00',
        scheduledDate: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      await loadData();
      if (selectedAsset) {
        await loadMaintenanceHistory(selectedAsset);
      }
    } catch (err: any) {
      alert(`Error logging maintenance: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeMaintRecord) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      await fetchWithAuth(`/api/assets/maintenance/${activeMaintRecord.id}/complete`, token, {
        method: 'PUT',
        body: JSON.stringify(completeForm)
      });

      setShowCompleteModal(false);
      setActiveMaintRecord(null);
      await loadData();
      if (selectedAsset) {
        await loadMaintenanceHistory(selectedAsset);
      }
    } catch (err: any) {
      alert(`Error completing maintenance: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assetsList.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assetCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedAsset ? setSelectedAsset(null) : navigate('/asset-dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-7 h-7 text-brand-orange" />
              Asset Maintenance Tracking
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Log preventive & corrective maintenance tasks, track service providers, and restore assets to Active status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogModal(true)}
            className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Log Maintenance Task
          </button>
        </div>
      </div>

      {selectedAsset ? (
        /* Detailed Asset Maintenance History Timeline */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{selectedAsset.assetCode}</div>
              <h2 className="text-xl font-bold text-slate-800">{selectedAsset.name}</h2>
              <div className="text-sm text-slate-500 mt-1">
                Category: <span className="font-medium text-slate-700">{selectedAsset.categoryName || 'General'}</span> |
                Status: <span className={`ml-1 font-semibold ${selectedAsset.status === 'UnderMaintenance' ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedAsset.status}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setLogForm(prev => ({ ...prev, assetId: selectedAsset.id }));
                setShowLogModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Schedule Task for this Asset
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
              Maintenance History Timeline ({maintenanceHistory.length})
            </div>
            {maintenanceHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No maintenance tasks recorded for this asset.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {maintenanceHistory.map((m: any) => (
                  <div key={m.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-base">{m.maintenanceType} Maintenance</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'InProgress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}</span>
                        {m.completedDate && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Completed: {new Date(m.completedDate).toLocaleDateString()}</span>}
                        {m.vendorName && <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Vendor: {m.vendorName}</span>}
                      </div>
                      {m.notes && <p className="text-xs text-slate-600 italic mt-1">"{m.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">{currencySymbol}{Number(m.cost).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">Total Cost</div>
                      </div>

                      {m.status !== 'Completed' && (
                        <button
                          onClick={() => {
                            setActiveMaintRecord(m);
                            setCompleteForm({ cost: String(m.cost || '0.00'), nextDueDate: '', notes: '' });
                            setShowCompleteModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Asset Maintenance Summary Grid */
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by code or name..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                  <th className="p-3.5">Acquisition Cost</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading assets...</td>
                  </tr>
                ) : paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No assets found.</td>
                  </tr>
                ) : (
                  paginatedAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{asset.assetCode}</td>
                      <td className="p-3.5 font-medium text-slate-800">{asset.name}</td>
                      <td className="p-3.5 text-slate-600">{asset.categoryName || 'General'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          asset.status === 'UnderMaintenance' ? 'bg-amber-100 text-amber-700' :
                          asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => loadMaintenanceHistory(asset)}
                          className="text-brand-orange hover:text-orange-600 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          View History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredAssets.length)}</span> of{' '}
                  <span className="font-medium">{filteredAssets.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Maintenance Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-brand-orange" />
              Log Maintenance Task
            </h3>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              {!selectedAsset && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Asset</label>
                  <select
                    required
                    value={logForm.assetId}
                    onChange={e => setLogForm({ ...logForm, assetId: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="">Select an asset...</option>
                    {assetsList.filter(a => a.status === 'Active').map(a => (
                      <option key={a.id} value={a.id}>{a.assetCode} — {a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Maintenance Type</label>
                <select
                  required
                  value={logForm.maintenanceType}
                  onChange={e => setLogForm({ ...logForm, maintenanceType: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                >
                  <option value="Preventive">Preventive Maintenance</option>
                  <option value="Corrective">Corrective Maintenance / Repair</option>
                  <option value="Warranty">Warranty Service</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor / Service Provider</label>
                  <select
                    value={logForm.vendorId}
                    onChange={e => setLogForm({ ...logForm, vendorId: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  >
                    <option value="">Select Vendor (Optional)</option>
                    {vendorsList.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Cost ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={logForm.cost}
                    onChange={e => setLogForm({ ...logForm, cost: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={logForm.scheduledDate}
                  onChange={e => setLogForm({ ...logForm, scheduledDate: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Task Notes & Instructions</label>
                <textarea
                  rows={3}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Details about issue or preventive checklist..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Log & Set UnderMaintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Maintenance Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Complete Maintenance Task
            </h3>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Final Actual Cost ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={completeForm.cost}
                  onChange={e => setCompleteForm({ ...completeForm, cost: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Next Maintenance Due Date (Optional)</label>
                <input
                  type="date"
                  value={completeForm.nextDueDate}
                  onChange={e => setCompleteForm({ ...completeForm, nextDueDate: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Completion Summary / Notes</label>
                <textarea
                  rows={3}
                  value={completeForm.notes}
                  onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  placeholder="Summary of repairs completed or replacement parts used..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-brand-orange outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Complete & Restore Active Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
