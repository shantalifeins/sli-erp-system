import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { canManageItem } from '@/src/shared/lib/itemPermissions';
import { Plus, Loader2, RefreshCcw, Trash2, ArrowLeft } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function StockTransfer() {
  const { getToken, dbUser, permissions } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  
  // Cart for items
  const [transferItems, setTransferItems] = useState<{itemId: string, quantity: string}[]>([]);
  const [currentItem, setCurrentItem] = useState('');
  const [currentQty, setCurrentQty] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const stPerms = permissions?.find((p: any) => p.module === 'Stock Transfer') || {};
  const canCreate = isSuperAdmin || stPerms.canCreate;

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const [itemsData, whData, stockData, stData] = await Promise.all([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/warehouses', token),
        fetchWithAuth('/api/inventory/warehouse-stock', token),
        fetchWithAuth('/api/stock-transfers', token)
      ]);
      setItems(itemsData);
      setWarehouses(whData);
      setWarehouseStock(stockData);
      setTransfers(stData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleAddItem = () => {
    if (!currentItem || !currentQty || parseInt(currentQty) <= 0) return;
    
    // Check stock in source
    const stock = warehouseStock.find(ws => ws.warehouseId === parseInt(sourceWarehouse) && ws.itemId === parseInt(currentItem));
    if (!stock || stock.quantity < parseInt(currentQty)) {
      alert("Insufficient stock in source warehouse!");
      return;
    }
    
    setTransferItems([...transferItems, { itemId: currentItem, quantity: currentQty }]);
    setCurrentItem('');
    setCurrentQty('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...transferItems];
    newItems.splice(index, 1);
    setTransferItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (transferItems.length === 0) {
      alert("Add at least one item to transfer.");
      return;
    }

    let hasAdmin = false;
    let hasIT = false;
    for (const item of transferItems) {
      const itemDetail = items.find(i => i.id === parseInt(item.itemId));
      if (itemDetail) {
        if (itemDetail.isAdminItem) hasAdmin = true;
        if (itemDetail.isItItem) hasIT = true;
      }
    }

    if (hasAdmin && hasIT) {
      alert("You cannot mix Admin and IT items in the same transfer. Please create separate transfers.");
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      alert("Source and destination must be different.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      await fetchWithAuth('/api/stock-transfers', token, {
        method: 'POST',
        body: JSON.stringify({
          sourceWarehouseId: parseInt(sourceWarehouse),
          destinationWarehouseId: parseInt(destinationWarehouse),
          items: transferItems.map(i => ({ itemId: parseInt(i.itemId), quantity: parseInt(i.quantity) }))
        })
      });
      setShowForm(false);
      setSourceWarehouse('');
      setDestinationWarehouse('');
      setTransferItems([]);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to submit transfer request.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter(t => 
    t.transferNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout
      search={{
        placeholder: "Search transfers...",
        onSearch: setSearchQuery
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800">Stock Transfer</h1>
            <p className="text-sm text-slate-500">Transfer stock between warehouses</p>
          </div>
          {canCreate && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-brand-orange/90"
            >
              <Plus size={20} />
              New Transfer
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : showForm ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">New Stock Transfer</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Source Warehouse <span className="text-red-500">*</span></label>
                <select
                  required
                  value={sourceWarehouse}
                  onChange={(e) => {
                    setSourceWarehouse(e.target.value);
                    setTransferItems([]);
                  }}
                  className="w-full border border-slate-200 rounded-lg p-3"
                >
                  <option value="">Select source warehouse...</option>
                  {warehouses.filter((w: any) => w.status === 'Active').map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Destination Warehouse <span className="text-red-500">*</span></label>
                <select
                  required
                  value={destinationWarehouse}
                  onChange={(e) => setDestinationWarehouse(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3"
                >
                  <option value="">Select destination warehouse...</option>
                  {warehouses.filter((w: any) => w.status === 'Active').map((w: any) => (
                    <option key={w.id} value={w.id} disabled={w.id.toString() === sourceWarehouse}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {sourceWarehouse && destinationWarehouse && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="font-bold text-slate-700 mb-4">Transfer Items</h3>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <select
                      value={currentItem}
                      onChange={(e) => setCurrentItem(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2"
                    >
                      <option value="">Select Item...</option>
                      {items.map(item => {
                        if (item.isFixedAsset) return null; // Fixed assets are transferred via Asset Management module
                        const wh = warehouses.find(w => w.id === parseInt(sourceWarehouse));
                        if (wh && !canManageItem(item, wh.itemType)) return null;

                        const stock = warehouseStock.find(ws => ws.warehouseId === parseInt(sourceWarehouse) && ws.itemId === item.id);
                        const qty = stock?.quantity || 0;
                        return (
                          <option key={item.id} value={item.id} disabled={qty === 0}>
                            {item.name} {item.isAdminItem ? '(Admin)' : ''} {item.isItItem ? '(IT)' : ''} (In stock: {qty})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                
                {transferItems.length > 0 && (
                  <table className="w-full text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((ti, idx) => {
                        const itemInfo = items.find(i => i.id === parseInt(ti.itemId));
                        return (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="p-3">{itemInfo?.name}</td>
                            <td className="p-3">{ti.quantity}</td>
                            <td className="p-3">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={submitting || transferItems.length === 0}
                className="flex items-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-brand-orange/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
                Submit Request
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-600">Transfer No</th>
                <th className="p-4 font-bold text-slate-600">Source</th>
                <th className="p-4 font-bold text-slate-600">Destination</th>
                <th className="p-4 font-bold text-slate-600">Status</th>
                <th className="p-4 font-bold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No transfers found</td></tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{t.transferNumber}</td>
                    <td className="p-4">{t.sourceWarehouseName}</td>
                    <td className="p-4">{t.destinationWarehouseName}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Received' ? 'bg-green-100 text-green-700' :
                        t.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        (t.status === 'Transit' || t.status === 'In Transit') ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {(t.status === 'Transit' || t.status === 'In Transit') ? '✈️ In Transit' : t.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      <div>Created: {new Date(t.createdAt).toLocaleDateString()}</div>
                      {t.dispatchDate && <div className="text-indigo-600 font-medium">Dispatched: {new Date(t.dispatchDate).toLocaleDateString()}</div>}
                      {t.actualArrivalDate && <div className="text-green-600 font-medium">Arrived: {new Date(t.actualArrivalDate).toLocaleDateString()}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
