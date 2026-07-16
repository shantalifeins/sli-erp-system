import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { canManageItem } from '@/src/shared/lib/itemPermissions';
import { Plus, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function StockOut() {
  const { getToken, dbUser, permissions } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'requests' | 'approvals'>('requests');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const stockOutPerms = permissions?.find((p: any) => p.module === 'Stock Out') || {};
  const canCreate = isSuperAdmin || stockOutPerms.canCreate;
  const canApprove = stockOutPerms.canApprove; // Explicitly follow the checkbox

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const [itemsData, requestsData, whData, whStockData] = await Promise.all([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/inventory/stock-out', token),
        fetchWithAuth('/api/my-warehouses', token),
        fetchWithAuth('/api/inventory/warehouse-stock', token)
      ]);
      setItems(itemsData);
      setRequests(requestsData);
      setWarehouses(whData);
      setWarehouseStock(whStockData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedWarehouse || !selectedItem || !quantity || !reason) return alert("Warehouse, Item, Quantity, and Reason are required");
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth('/api/inventory/stock-out', token, {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: selectedWarehouse,
          itemId: selectedItem,
          quantity,
          reason
        })
      });
      alert("Stock Out requested successfully");
      setSelectedWarehouse('');
      setSelectedItem('');
      setQuantity('');
      setReason('');
      setShowForm(false);
      loadData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth(`/api/inventory/stock-out/${id}/${action}`, token, {
        method: 'POST',
      });
      alert(`Request ${action}d successfully`);
      loadData();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  const filteredRequests = requests.filter(req => {
    const wh = warehouses.find((w: any) => w.id === req.warehouseId);
    if (wh && !canManageItem(req, wh.itemType)) return false;
    const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';
    if (!isAdmin && !wh) return false;
    return true;
  });

  const myRequests = filteredRequests.filter((r: any) => r.requestedBy === dbUser?.uid);
  const pendingApprovals = filteredRequests.filter((r: any) => r.status === 'Pending');

  return (
    <PageLayout loading={loading} search={{ placeholder: "Search stock out...", onSearch: setSearchQuery }}>
      <div className="space-y-6 flex flex-col h-full">
        
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div className="flex space-x-6">
            <button
              className={`pb-4 -mb-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'requests' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-slate-400 hover:text-slate-800'}`}
              onClick={() => setActiveTab('requests')}
            >
              My Requests
            </button>
            {canApprove && (
              <button
                className={`pb-4 -mb-4 text-sm font-bold tracking-wider uppercase transition-colors flex items-center gap-2 ${activeTab === 'approvals' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-slate-400 hover:text-slate-800'}`}
                onClick={() => setActiveTab('approvals')}
              >
                Approvals Needed
                {pendingApprovals.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">{pendingApprovals.length}</span>
                )}
              </button>
            )}
          </div>
          {activeTab === 'requests' && canCreate && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              New Request
            </button>
          )}
        </div>

        {activeTab === 'requests' && showForm && canCreate && (
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">New Stock Out Request</h3>
            </div>
            <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Warehouse *</label>
                  <select
                    required
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white"
                    value={selectedWarehouse}
                    onChange={(e) => {
                      setSelectedWarehouse(e.target.value);
                      setSelectedItem(''); // Reset item when warehouse changes
                    }}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.filter((wh: any) => wh.status === 'Active').map((wh: any) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item *</label>
                  <select
                    required
                    disabled={!selectedWarehouse}
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white disabled:opacity-50 disabled:bg-slate-50"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="">-- Select Item --</option>
                    {selectedWarehouse && items.map((item: any) => {
                      const wh = warehouses.find((w: any) => w.id === parseInt(selectedWarehouse));
                      if (wh && !canManageItem(item, wh.itemType)) return null;

                      const stockRecord = warehouseStock.find(ws => ws.warehouseId === parseInt(selectedWarehouse) && ws.itemId === item.id);
                      const availableQty = stockRecord ? stockRecord.quantity : 0;
                      if (availableQty <= 0) return null; // Hide items with no stock in this warehouse
                      
                      return (
                        <option key={item.id} value={item.id}>
                          {item.itemCode} - {item.name} {item.isAdminItem ? '(Admin)' : ''} {item.isItItem ? '(IT)' : ''} - Available: {availableQty}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason *</label>
                <textarea
                  required
                  className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this stock out needed?"
                  rows={2}
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-6 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Request Approval
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {activeTab === 'requests' && !showForm && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <th className="px-4 py-3">Request #</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {myRequests
                  .filter(req => 
                    (req.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                    (req.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                    (req.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
                  )
                  .map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-slate-700 font-bold">
                      {req.itemName}
                      <div className="flex gap-1 mt-1">
                        {req.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                        {req.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{req.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {myRequests.filter(req => (req.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (req.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (req.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || '')).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">No requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <th className="px-4 py-3">Request #</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {pendingApprovals
                  .filter(req => 
                    (req.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                    (req.requestedByName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                    (req.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                    (req.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
                  )
                  .map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{req.requestedByName}</td>
                    <td className="px-4 py-3 text-slate-700 font-bold">
                      {req.itemName}
                      <div className="flex gap-1 mt-1">
                        {req.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                        {req.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.quantity}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={req.reason}>{req.reason}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleAction(req.id, 'approve')}
                        className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(req.id, 'reject')}
                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingApprovals.filter(req => (req.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (req.requestedByName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (req.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (req.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || '')).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">No pending approvals.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </PageLayout>
  );
}


