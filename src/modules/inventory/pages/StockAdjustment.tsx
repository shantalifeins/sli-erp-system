import React, { useEffect, useState } from 'react';
import { ArrowLeft, PackageX, Plus, Search, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';

interface InventoryItem {
  id: number;
  itemCode: string;
  name: string;
  uom: string;
  quantityInStock: number;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Adjustment {
  id: number;
  itemName: string;
  warehouseName: string;
  adjustmentQty: number;
  adjustedFromQty: number;
  adjustedToQty: number;
  reason: string;
  status: string;
  createdAt: string;
}

export default function StockAdjustment() {
  const { getToken, dbUser, permissions } = useAuth();
  const [view, setView] = useState<'list' | 'form'>('list');

  // Form state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form fields
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const adjustPerms = permissions?.find((p: any) => p.module === 'Stock Adjustment') || {};
  const canCreate = isSuperAdmin || adjustPerms.canCreate;

  const selectedItem = items.find(i => String(i.id) === selectedItemId);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const [itemsData, warehousesData, adjData] = await Promise.all([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/warehouses', token),
        fetchWithAuth('/api/inventory/stock-adjustments', token),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      setAdjustments(Array.isArray(adjData) ? adjData : []);
    } catch (err) {
      console.error('Failed to load stock adjustment data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !selectedWarehouseId || !quantity || !reason.trim()) {
      setSubmitResult({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setSubmitResult({ type: 'error', message: 'Quantity must be a positive number.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const token = await getToken();
      const finalQty = adjustmentType === 'deduct' ? -qty : qty;
      const currentQty = selectedItem?.quantityInStock || 0;
      const newQty = currentQty + finalQty;

      if (newQty < 0) {
        setSubmitResult({ type: 'error', message: `Cannot deduct ${qty} from ${currentQty} in stock. Insufficient stock.` });
        setIsSubmitting(false);
        return;
      }

      const res = await fetchWithAuth('/api/inventory/stock-adjustments', token, {
        method: 'POST',
        body: JSON.stringify({
          itemId: parseInt(selectedItemId),
          warehouseId: parseInt(selectedWarehouseId),
          adjustmentQty: finalQty,
          reason: reason.trim(),
          notes: notes.trim(),
          adjustedFromQty: currentQty,
          adjustedToQty: newQty,
        }),
      });
      if (res?.id || res?.success) {
        setSubmitResult({ type: 'success', message: 'Stock adjustment recorded successfully.' });
        setSelectedItemId('');
        setSelectedWarehouseId('');
        setQuantity('');
        setReason('');
        setNotes('');
        setAdjustmentType('add');
        await loadData();
        setTimeout(() => { setView('list'); setSubmitResult(null); }, 1500);
      } else {
        setSubmitResult({ type: 'error', message: res?.error || 'Failed to record adjustment.' });
      }
    } catch (err: any) {
      setSubmitResult({ type: 'error', message: err?.message || 'Failed to record adjustment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdjustments = adjustments.filter(a =>
    a.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const REASONS = [
    'Physical count variance',
    'Damage / spoilage',
    'Expiry / obsolescence',
    'Return to stock',
    'System error correction',
    'Inter-warehouse correction',
    'Other',
  ];

  return (
    <PageLayout loading={loading}>
      <div className="space-y-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center">
          {view === 'form' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setView('list'); setSubmitResult(null); }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">New Stock Adjustment</h2>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800">Stock Adjustments</h2>
              {canCreate && (
                <button
                  onClick={() => setView('form')}
                  className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-xs transition-colors"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Adjustment
                </button>
              )}
            </>
          )}
        </div>

        {/* Form View */}
        {view === 'form' && (
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Inventory Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                  >
                    <option value="">Select item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.itemCode} — {item.name} (In Stock: {item.quantityInStock} {item.uom})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warehouse Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                {/* Adjustment Type + Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Adjustment Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('add')}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${adjustmentType === 'add' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        + Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('deduct')}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${adjustmentType === 'deduct' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      >
                        − Deduct Stock
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                {/* Preview */}
                {selectedItem && quantity && (
                  <div className={`p-3 rounded-lg text-sm border ${adjustmentType === 'add' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <strong>Preview:</strong> {selectedItem.name} will go from{' '}
                    <strong>{selectedItem.quantityInStock}</strong> →{' '}
                    <strong>
                      {adjustmentType === 'add'
                        ? selectedItem.quantityInStock + parseInt(quantity || '0')
                        : selectedItem.quantityInStock - parseInt(quantity || '0')}
                    </strong> {selectedItem.uom}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                  >
                    <option value="">Select reason...</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 resize-none"
                    placeholder="Optional additional details..."
                  />
                </div>

                {submitResult && (
                  <div className={`flex items-start gap-3 p-4 rounded-lg ${submitResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {submitResult.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                    <span className="text-sm">{submitResult.message}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setView('list'); setSubmitResult(null); }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Search */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search adjustments..."
                className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3 text-right">Before</th>
                    <th className="px-4 py-3 text-right">Adjustment</th>
                    <th className="px-4 py-3 text-right">After</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <PackageX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No stock adjustments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{adj.itemName || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{adj.warehouseName || '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{adj.adjustedFromQty}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${adj.adjustmentQty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.adjustmentQty > 0 ? '+' : ''}{adj.adjustmentQty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{adj.adjustedToQty}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{adj.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            adj.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            adj.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {adj.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(adj.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
