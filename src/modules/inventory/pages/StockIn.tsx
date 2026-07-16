import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { canManageItem } from '@/src/shared/lib/itemPermissions';
import { Plus, Loader2, ArrowLeft } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function StockIn() {
  const { getToken, dbUser, permissions } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const stockInPerms = permissions?.find((p: any) => p.module === 'Stock In') || {};
  const canCreate = isSuperAdmin || stockInPerms.canCreate;

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const [itemsData, catData, historyData, warehouseData, vendorData] = await Promise.all([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/inventory/categories', token),
        fetchWithAuth('/api/inventory/stock-in', token),
        fetchWithAuth('/api/my-warehouses', token),
        fetchWithAuth('/api/vendors', token)
      ]);
      setItems(itemsData);
      setCategories(catData);
      setHistory(historyData);
      setWarehouses(warehouseData);
      setVendors(vendorData);
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
    if (!selectedItem || !quantity) return alert("Item and Quantity are required");
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth('/api/inventory/stock-in', token, {
        method: 'POST',
        body: JSON.stringify({
          itemId: selectedItem,
          warehouseId: selectedWarehouse,
          vendorId: selectedVendor || null,
          quantity,
          remarks
        })
      });
      alert("Stock In successful");
      setSelectedItem('');
      setSelectedWarehouse('');
      setSelectedVendor('');
      setQuantity('');
      setRemarks('');
      setSelectedCategory('');
      setShowForm(false);
      loadData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (selectedWarehouse) {
      const wh = warehouses.find((w: any) => w.id === parseInt(selectedWarehouse));
      if (wh && !canManageItem(item, wh.itemType)) return false;
    }
    return true;
  });

  const filteredHistory = history.filter(record => {
    const wh = warehouses.find((w: any) => w.id === record.warehouseId);
    if (wh && !canManageItem(record, wh.itemType)) return false;
    // Admins see everything, but if not admin and warehouse is not in assigned warehouses, it should be filtered?
    // Actually, non-admin only has assigned warehouses in `warehouses` list!
    // So if `wh` is undefined, it means this record is for a warehouse they are not assigned to!
    // Except if they are admin, they have all warehouses. So if `wh` is undefined, they probably shouldn't see it either, unless it's a deleted warehouse.
    // Wait, the API `/api/inventory/stock-in` returns all records for the company! 
    // We MUST filter by assigned warehouses!
    const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';
    if (!isAdmin && !wh) return false; // Hide records for unassigned warehouses
    return true;
  });

  return (
    <PageLayout loading={loading} search={{ placeholder: "Search stock in...", onSearch: setSearchQuery }}>
      <div className="space-y-6 flex flex-col h-full">
        
        {!showForm && (
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-wider">Stock In History</h2>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              {showForm ? 'Cancel' : 'New Stock In'}
            </button>
          )}
        </div>
        )}

      {showForm && canCreate && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">Record New Stock In</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Warehouse</label>
                  <select
                    required
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white"
                    value={selectedWarehouse}
                    onChange={(e) => {
                      setSelectedWarehouse(e.target.value);
                      setSelectedItem(''); // Reset item if warehouse changes and item types don't match
                    }}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.filter((w: any) => w.status === 'Active').map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Category</label>
                  <select
                    required
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white disabled:bg-slate-50"
                    value={selectedCategory}
                    disabled={!selectedWarehouse}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedItem('');
                    }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Name</label>
                  <select
                    required
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white disabled:bg-slate-50"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    disabled={!selectedCategory || !selectedWarehouse}
                  >
                    <option value="">-- Select Item --</option>
                    {filteredItems.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.itemCode} - {item.name} {item.isAdminItem ? '(Admin)' : ''} {item.isItItem ? '(IT)' : ''} - Stock: {item.quantityInStock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor (Optional)</label>
                  <select
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white"
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remarks</label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional notes or reference number"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting || !canCreate}
                  className="inline-flex items-center px-6 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Stock In
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

        {!showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3">Added By</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredHistory
                .filter(record => 
                  (record.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                  (record.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                  (record.category?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                  (record.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                  (record.performedByName?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
                )
                .map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-bold">
                    {record.itemName} <span className="text-slate-400 text-xs font-normal">({record.itemCode})</span>
                    <div className="flex gap-1 mt-1">
                      {record.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                      {record.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{record.category}</td>
                  <td className="px-4 py-3 text-slate-600">{record.warehouseName}</td>
                  <td className="px-4 py-3 text-slate-600">{record.vendorName}</td>
                  <td className="px-4 py-3 text-emerald-600 font-bold">+{record.quantity}</td>
                  <td className="px-4 py-3 text-slate-600">{record.referenceId || '-'}</td>
                  <td className="px-4 py-3 text-brand-blue font-medium">{record.performedByName}</td>
                </tr>
              ))}
              {filteredHistory.filter(record => (record.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (record.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (record.category?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (record.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (record.performedByName?.toLowerCase().includes(searchQuery.toLowerCase()) || '')).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">No stock in records found.</td>
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


