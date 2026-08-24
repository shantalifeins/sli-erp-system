import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';

interface RejectedItem {
  id: number;
  grnNumber?: string;
  itemName: string;
  quantityRejected: number;
  defectCategory?: string;
  dispositionType?: string;
  status: string;
  vendorCreditNoteNumber?: string;
  notes?: string;
  createdAt: string;
  disposedAt?: string;
}

const DISPOSITION_TYPES = [
  { value: 'Return_to_Vendor', label: 'Return to Vendor', icon: '↩️', color: 'text-blue-600' },
  { value: 'Scrap', label: 'Scrap', icon: '🗑️', color: 'text-red-600' },
  { value: 'Rework', label: 'Rework', icon: '🔧', color: 'text-orange-600' },
];

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In_Process': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-green-100 text-green-800',
};

export default function RejectedItems() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<RejectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeModal, setActiveModal] = useState<RejectedItem | null>(null);
  const [dispositionType, setDispositionType] = useState('');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = useCallback(async () => {
    const t = await getToken();
    return { Authorization: `Bearer ${t}` };
  }, [getToken]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/inventory/rejected-items', { headers });
      if (res.ok) setItems(await res.json());
    } finally { setLoading(false); }
  }, [getHeaders]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSetDisposition = async () => {
    if (!activeModal || !dispositionType || submitting) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/inventory/rejected-items/${activeModal.id}/disposition`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispositionType, vendorCreditNoteNumber: creditNoteNumber, notes }),
      });
      if (res.ok) {
        await fetchItems();
        setActiveModal(null);
        setDispositionType('');
        setCreditNoteNumber('');
        setNotes('');
      }
    } finally { setSubmitting(false); }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('Mark this disposition as Completed?')) return;
    const headers = await getHeaders();
    await fetch(`/api/inventory/rejected-items/${id}/complete`, { method: 'PUT', headers });
    await fetchItems();
  };

  const filtered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus);

  const pendingCount = items.filter(i => i.status === 'Pending').length;
  const inProcessCount = items.filter(i => i.status === 'In_Process').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
          Rejected Items Management
        </h1>
        <p className="text-sm text-gray-500">Manage disposition of QC-rejected items</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs font-medium text-yellow-600 mb-1">Awaiting Disposition</p>
          <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 mb-1">In Process</p>
          <p className="text-3xl font-bold text-blue-900">{inProcessCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-600 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-900">{items.filter(i => i.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'Pending', 'In_Process', 'Completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s === 'all' ? 'All' : s === 'In_Process' ? 'In Process' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Item</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">GRN #</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Rejected Qty</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Defect Category</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Disposition</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No rejected items found.</p>
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.itemName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{item.grnNumber || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{item.quantityRejected}</td>
                  <td className="px-4 py-3">
                    {item.defectCategory ? (
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{item.defectCategory}</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.dispositionType ? (
                      <span className="text-xs text-gray-700">
                        {DISPOSITION_TYPES.find(d => d.value === item.dispositionType)?.icon}{' '}
                        {DISPOSITION_TYPES.find(d => d.value === item.dispositionType)?.label || item.dispositionType}
                      </span>
                    ) : <span className="text-gray-400 text-xs">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status === 'In_Process' ? 'In Process' : item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {item.status === 'Pending' && (
                        <button onClick={() => { setActiveModal(item); setDispositionType(item.dispositionType || ''); }}
                          className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700">
                          Set Action
                        </button>
                      )}
                      {item.status === 'In_Process' && (
                        <button onClick={() => handleComplete(item.id)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disposition Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Set Disposition</h3>
            <p className="text-sm text-gray-500 mb-5">{activeModal.itemName} · {activeModal.quantityRejected} units rejected</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disposition Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISPOSITION_TYPES.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDispositionType(d.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${dispositionType === d.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <span className="text-xl">{d.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {dispositionType === 'Return_to_Vendor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Note Number</label>
                  <input type="text" value={creditNoteNumber} onChange={e => setCreditNoteNumber(e.target.value)}
                    placeholder="CN-XXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSetDisposition} disabled={!dispositionType || submitting}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Disposition'}
              </button>
              <button onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
