import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Plus, Play, CheckCircle, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

interface StockCount {
  id: number;
  countNumber: string;
  countType: string;
  status: string;
  scheduledDate: string;
  actualStartDate?: string;
  completedDate?: string;
  warehouseName?: string;
  warehouseId: number;
  totalItemsCounted: number;
  totalVariances: number;
  totalVarianceValue: string;
  notes?: string;
  createdAt: string;
}

interface CountDetail {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  uom: string;
  basePrice: string;
  systemQty: number;
  physicalQty?: number;
  varianceQty?: number;
  varianceValue?: string;
  varianceReason?: string;
  adjusted: boolean;
  notes?: string;
}

interface Warehouse {
  id: number;
  name: string;
}

const COUNT_TYPE_OPTIONS = ['Annual', 'Cycle', 'Spot-Check'];
const VARIANCE_REASONS = ['Theft', 'Damage', 'Data Entry Error', 'Expired', 'System Glitch', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'In-Progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'Completed': 'bg-purple-100 text-purple-800 border-purple-200',
  'Approved': 'bg-green-100 text-green-800 border-green-200',
};

export default function StockReconciliation() {
  const { getToken, dbUser } = useAuth();
  const currencySymbol = useCurrency();

  const getHeaders = useCallback(async () => {
    const t = await getToken();
    return { Authorization: `Bearer ${t}` };
  }, [getToken]);

  const [counts, setCounts] = useState<StockCount[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [details, setDetails] = useState<CountDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [form, setForm] = useState({ warehouseId: '', countType: 'Spot-Check', scheduledDate: '', notes: '' });

  // Detail editing state
  const [editingDetail, setEditingDetail] = useState<Record<number, { physicalQty: string; varianceReason: string; notes: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/inventory/stock-counts', { headers });
      if (res.ok) setCounts(await res.json());
    } finally { setLoading(false); }
  }, [getHeaders]);

  const fetchWarehouses = useCallback(async () => {
    const headers = await getHeaders();
    const res = await fetch('/api/warehouses', { headers });
    if (res.ok) setWarehouses(await res.json());
  }, [getHeaders]);

  useEffect(() => {
    fetchCounts();
    fetchWarehouses();
  }, [fetchCounts, fetchWarehouses]);

  const fetchDetails = useCallback(async (countId: number) => {
    setDetailsLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/inventory/stock-counts/${countId}/details`, { headers });
      if (res.ok) {
        const data: CountDetail[] = await res.json();
        setDetails(data);
        // Initialize editing state
        const init: Record<number, { physicalQty: string; varianceReason: string; notes: string }> = {};
        data.forEach(d => {
          init[d.id] = {
            physicalQty: d.physicalQty !== null && d.physicalQty !== undefined ? String(d.physicalQty) : '',
            varianceReason: d.varianceReason || '',
            notes: d.notes || '',
          };
        });
        setEditingDetail(init);
      }
    } finally { setDetailsLoading(false); }
  }, [getHeaders]);

  const handleCreateCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/inventory/stock-counts', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId: form.warehouseId, countType: form.countType, scheduledDate: form.scheduledDate, notes: form.notes }),
      });
      if (res.ok) {
        await fetchCounts();
        setView('list');
        setForm({ warehouseId: '', countType: 'Spot-Check', scheduledDate: '', notes: '' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create count');
      }
    } finally { setSubmitting(false); }
  };

  const handleStartCount = async (countId: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      await fetch(`/api/inventory/stock-counts/${countId}/start`, { method: 'PUT', headers });
      await fetchCounts();
      if (selectedCount?.id === countId) setSelectedCount(prev => prev ? { ...prev, status: 'In-Progress' } : null);
    } finally { setSubmitting(false); }
  };

  const handleSaveDetail = async (detailId: number) => {
    const edit = editingDetail[detailId];
    if (!edit || edit.physicalQty === '') return;
    const headers = await getHeaders();
    await fetch(`/api/inventory/stock-counts/details/${detailId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ physicalQty: Number(edit.physicalQty), varianceReason: edit.varianceReason, notes: edit.notes }),
    });
    await fetchDetails(selectedCount!.id);
  };

  const handleCompleteCount = async () => {
    if (submitting || !selectedCount) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/inventory/stock-counts/${selectedCount.id}/complete`, { method: 'PUT', headers });
      if (res.ok) {
        await fetchCounts();
        await fetchDetails(selectedCount.id);
        setSelectedCount(prev => prev ? { ...prev, status: 'Completed' } : null);
      }
    } finally { setSubmitting(false); }
  };

  const handleApproveCount = async () => {
    if (submitting || !selectedCount) return;
    if (!confirm('Approve this stock count? All variances will be applied to warehouse stock immediately.')) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/inventory/stock-counts/${selectedCount.id}/approve`, { method: 'PUT', headers });
      if (res.ok) {
        const data = await res.json();
        await fetchCounts();
        await fetchDetails(selectedCount.id);
        setSelectedCount(prev => prev ? { ...prev, status: 'Approved' } : null);
        alert(`✅ Approved! ${data.adjustmentsApplied} stock adjustments applied.`);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } finally { setSubmitting(false); }
  };

  const filteredDetails = details.filter(d =>
    d.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetail = (count: StockCount) => {
    setSelectedCount(count);
    fetchDetails(count.id);
    setView('detail');
  };

  const totalVariances = details.filter(d => (d.varianceQty || 0) !== 0).length;
  const totalVarianceValue = details.reduce((sum, d) => sum + Number(d.varianceValue || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-indigo-600" />
              Stock Reconciliation
            </h1>
            <p className="text-sm text-gray-500">Physical stock counts and variance adjustments</p>
          </div>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Stock Count
          </button>
        )}
      </div>

      {/* CREATE FORM */}
      {view === 'create' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-5 text-gray-800">Initiate New Physical Stock Count</h2>
          <form onSubmit={handleCreateCount} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
              <select
                required
                value={form.warehouseId}
                onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Count Type</label>
              <select
                value={form.countType}
                onChange={e => setForm(f => ({ ...f, countType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {COUNT_TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
              <input
                type="date"
                required
                value={form.scheduledDate}
                onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
                {submitting ? 'Creating...' : 'Create Stock Count'}
              </button>
              <button type="button" onClick={() => setView('list')} className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Count #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Warehouse</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Scheduled</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Variances</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Variance Value</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : counts.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No stock counts yet. Create your first count.</p>
                  </td></tr>
                ) : (
                  counts.map(count => (
                    <tr key={count.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{count.countNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{count.warehouseName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{count.countType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${STATUS_COLORS[count.status] || 'bg-gray-100 text-gray-600'}`}>
                          {count.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{new Date(count.scheduledDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {count.totalVariances > 0 ? (
                          <span className="text-amber-600 font-semibold">{count.totalVariances}</span>
                        ) : <span className="text-gray-400">{count.totalItemsCounted > 0 ? '0' : '-'}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {Number(count.totalVarianceValue) !== 0
                          ? `${currencySymbol}${Math.abs(Number(count.totalVarianceValue)).toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(count)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-3 py-1 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          {count.status === 'Pending' ? 'Start' : 'View'}
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

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedCount && (
        <div className="space-y-5">
          {/* Count summary card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCount.countNumber}</h2>
                <p className="text-sm text-gray-500">{selectedCount.warehouseName} · {selectedCount.countType}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_COLORS[selectedCount.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedCount.status}
                </span>
                {selectedCount.status === 'Pending' && (
                  <button onClick={() => handleStartCount(selectedCount.id)} disabled={submitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                    <Play className="h-3.5 w-3.5" /> Start Counting
                  </button>
                )}
                {selectedCount.status === 'In-Progress' && (
                  <button onClick={handleCompleteCount} disabled={submitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                  </button>
                )}
                {selectedCount.status === 'Completed' && (
                  <button onClick={handleApproveCount} disabled={submitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve & Apply Adjustments
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            {(selectedCount.status === 'Completed' || selectedCount.status === 'Approved') && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Items Counted</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedCount.totalItemsCounted}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Variances Found</p>
                  <p className="text-2xl font-bold text-amber-900">{selectedCount.totalVariances}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Variance Value</p>
                  <p className="text-lg font-bold text-red-900">{currencySymbol}{Math.abs(Number(selectedCount.totalVarianceValue)).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Count details table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Item Count Details</h3>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Item</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">System Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Physical Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Variance</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Reason</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailsLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading items...</td></tr>
                  ) : filteredDetails.map(detail => {
                    const edit = editingDetail[detail.id] || { physicalQty: '', varianceReason: '', notes: '' };
                    const physQty = edit.physicalQty !== '' ? Number(edit.physicalQty) : undefined;
                    const variance = physQty !== undefined ? physQty - detail.systemQty : (detail.varianceQty ?? undefined);
                    const isVariance = variance !== undefined && variance !== 0;
                    const canEdit = selectedCount.status === 'In-Progress';

                    return (
                      <tr key={detail.id} className={`hover:bg-gray-50 ${isVariance ? 'bg-amber-50/30' : ''} ${detail.adjusted ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{detail.itemName}</p>
                          <p className="text-xs text-gray-400">{detail.itemCode}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">{detail.systemQty} <span className="text-gray-400 text-xs">{detail.uom}</span></td>
                        <td className="px-4 py-2.5 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              min={0}
                              value={edit.physicalQty}
                              onChange={e => setEditingDetail(prev => ({ ...prev, [detail.id]: { ...prev[detail.id], physicalQty: e.target.value } }))}
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="Enter qty"
                            />
                          ) : (
                            <span className="font-mono text-gray-700">{detail.physicalQty ?? '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {variance !== undefined ? (
                            <span className={`font-mono font-semibold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {variance > 0 ? '+' : ''}{variance}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {canEdit && isVariance ? (
                            <select
                              value={edit.varianceReason}
                              onChange={e => setEditingDetail(prev => ({ ...prev, [detail.id]: { ...prev[detail.id], varianceReason: e.target.value } }))}
                              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">Select reason...</option>
                              {VARIANCE_REASONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-500">{detail.varianceReason || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {canEdit && edit.physicalQty !== '' && (
                            <button
                              onClick={() => handleSaveDetail(detail.id)}
                              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              Save
                            </button>
                          )}
                          {detail.adjusted && (
                            <span className="text-xs text-green-600 font-medium">✓ Adjusted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
