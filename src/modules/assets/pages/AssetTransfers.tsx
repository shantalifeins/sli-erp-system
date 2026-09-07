import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import PageLayout from '@/src/shared/components/PageLayout';
import SearchableSelect from '@/src/shared/components/SearchableSelect';
import { 
  ArrowLeftRight, 
  Plus, 
  ArrowLeft, 
  Building, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2
} from 'lucide-react';

export default function AssetTransfers() {
  const navigate = useNavigate();
  const { getToken, dbUser, permissions } = useAuth();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const getPermission = (menuName: string) => {
    return permissions?.find((p: any) => p.menu === menuName);
  };

  const canView = isSuperAdmin || getPermission('Asset Transfers')?.canView;
  const canCreate = isSuperAdmin || getPermission('Asset Transfers')?.canCreate;

  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [toCustodianUid, setToCustodianUid] = useState('');
  const [reason, setReason] = useState('');

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [transfersRes, assetsRes, branchesRes, usersRes] = await Promise.all([
        fetchWithAuth('/api/assets/transfers', token),
        fetchWithAuth('/api/assets', token),
        fetchWithAuth('/api/branches', token),
        fetchWithAuth('/api/users?status=Active', token)
      ]);

      setTransfers(transfersRes.transfers || []);
      setAssets(assetsRes.assets || []);
      setBranches(branchesRes || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error('Failed to load asset transfers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [getToken, canView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedAssetId) {
      alert('Please select an asset to transfer.');
      return;
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the transfer.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      await fetchWithAuth(`/api/assets/${selectedAssetId}/transfer`, token, {
        method: 'POST',
        body: JSON.stringify({
          toBranchId: toBranchId ? parseInt(toBranchId) : null,
          toCustodianUid: toCustodianUid || null,
          reason: reason.trim()
        })
      });

      setShowModal(false);
      setSelectedAssetId('');
      setToBranchId('');
      setToCustodianUid('');
      setReason('');
      await loadData();
    } catch (err: any) {
      alert('Transfer request failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transfers
  const filteredTransfers = transfers.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const assetName = t.assetName?.toLowerCase() || '';
      const assetTag = t.assetTag?.toLowerCase() || '';
      const reasonText = t.reason?.toLowerCase() || '';
      return assetName.includes(q) || assetTag.includes(q) || reasonText.includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage) || 1;
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!canView) {
    return (
      <PageLayout loading={false}>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="text-lg font-bold">Access Denied</p>
          <p className="text-sm">You do not have permission to view Asset Transfers.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      loading={loading}
      search={{
        placeholder: "Search asset transfers by tag, asset name or reason...",
        onSearch: setSearchQuery
      }}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/assets')} 
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Back to Asset Register"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-brand-orange" />
                Asset Transfers
              </h1>
              <p className="text-xs text-slate-500">Manage and track fixed asset movement across branches & custodians</p>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-md hover:bg-brand-orange/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Transfer Request
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase">Status Filter:</span>
          {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === st 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Asset Tag / Name</th>
                  <th className="p-4">From Branch → To Branch</th>
                  <th className="p-4">From Custodian → To Custodian</th>
                  <th className="p-4">Reason / Notes</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No asset transfer requests found.
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{t.assetName || 'Asset'}</div>
                        <div className="text-xs text-brand-orange font-mono">{t.assetTag || 'Pending Tag'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.fromBranchName}</span>
                          <span className="text-brand-orange font-bold">→</span>
                          <span className="font-semibold text-slate-900">{t.toBranchName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.fromCustodianName}</span>
                          <span className="text-brand-orange font-bold">→</span>
                          <span className="font-semibold text-slate-900">{t.toCustodianName}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs truncate text-xs text-slate-600">
                        {t.reason || 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          t.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {t.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {t.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                          {t.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs text-slate-400 whitespace-nowrap">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransfers.length)} of {filteredTransfers.length} transfers
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-brand-orange" />
                Request Asset Transfer
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Select Asset <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={assets
                    .filter(a => a.status === 'Active')
                    .map(a => ({
                      label: `${a.assetTag ? `[${a.assetTag}] ` : ''}${a.name}`,
                      value: a.id
                    }))}
                  value={selectedAssetId}
                  onChange={(val) => setSelectedAssetId(val)}
                  placeholder="Select active asset to transfer..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Destination Branch
                  </label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none bg-white"
                  >
                    <option value="">No branch change</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Destination Custodian
                  </label>
                  <select
                    value={toCustodianUid}
                    onChange={(e) => setToCustodianUid(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none bg-white"
                  >
                    <option value="">No custodian change</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role || 'User'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Reason for Transfer <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none"
                  rows={3}
                  placeholder="e.g. Relocating workstation to Chittagong branch for new project"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedAssetId || !reason.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-white font-bold text-sm rounded bg-brand-orange hover:bg-brand-orange/90 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
