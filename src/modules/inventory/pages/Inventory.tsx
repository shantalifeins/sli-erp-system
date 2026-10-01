import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Box, Plus, X, ArrowLeft, Upload, Paperclip, Edit2 } from 'lucide-react';
import AttachmentPanel from '@/src/shared/components/AttachmentPanel';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { BulkUploadModal } from '../components/BulkUploadModal';
import { ItemForm } from '../components/ItemForm';

export default function Inventory() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const inventoryPerms = permissions?.find((p: any) => p.module === 'Inventory Items') || {};
  const canCreate = isSuperAdmin || inventoryPerms.canCreate;
  const canEdit = isSuperAdmin || inventoryPerms.canEdit;

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [itemsResult, catResult, assetCatResult] = await Promise.allSettled([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/inventory/categories', token),
        fetchWithAuth('/api/assets/categories', token),
      ]);

      if (itemsResult.status === 'fulfilled') {
        setItems(Array.isArray(itemsResult.value) ? itemsResult.value : []);
      } else {
        console.warn('Failed to load inventory items:', itemsResult.reason);
        setItems([]);
      }

      if (catResult.status === 'fulfilled') {
        setCategories(Array.isArray(catResult.value) ? catResult.value : []);
      } else {
        console.warn('Failed to load item categories:', catResult.reason);
        setCategories([]);
      }

      if (assetCatResult.status === 'fulfilled') {
        const raw = assetCatResult.value;
        setAssetCategories(raw?.categories || (Array.isArray(raw) ? raw : []));
      } else {
        console.warn('Failed to load asset categories:', assetCatResult.reason);
        setAssetCategories([]);
      }
    } catch (error) {
      console.error('loadData error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const locationHook = useLocation();
  const queryParams = new URLSearchParams(locationHook.search);
  const filterParam = queryParams.get('filter');

  let baseFilteredItems = items;
  if (filterParam === 'low-stock') {
    baseFilteredItems = items.filter(item => (item.quantityInStock || 0) <= (item.reorderLevel || 0) && (item.reorderLevel || 0) > 0);
  } else if (filterParam === 'fixed-assets') {
    baseFilteredItems = items.filter(item => item.isFixedAsset);
  }

  const filteredItems = baseFilteredItems.filter(item => 
    (item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
    (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (item.category?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout 
      loading={loading}
      search={{ placeholder: "Search inventory items...", onSearch: setSearchQuery }}
      pagination={showForm ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
      <div className="space-y-6 flex flex-col h-full">
        {!showForm && (
        <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Inventory Items</h2>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded text-sm font-bold shadow-xs transition-colors"
            >
              <Upload className="-ml-1 mr-2 h-4 w-4 text-slate-600" aria-hidden="true" />
              Bulk Upload
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(!showForm);
              }}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-xs transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              {showForm ? 'Cancel' : 'Add Item'}
            </button>
          </div>
        )}
      </div>
        )}

      {showForm && (canCreate || canEdit) && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6 max-h-[85vh] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">{editingItem ? `Edit Inventory Item: ${editingItem.itemCode}` : 'New Inventory Item'}</h3>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
          
        <ItemForm
          initialData={editingItem || {}}
          categories={categories}
          assetCategories={assetCategories}
          onSubmit={async (data: any) => {
             try {
                const token = await getToken();
                if (!token) return;
                
                if (data.category && !categories.find(c => c.name.toLowerCase() === data.category.toLowerCase())) {
                  try {
                    await fetchWithAuth('/api/inventory/categories', token, {
                      method: 'POST',
                      body: JSON.stringify({ name: data.category, description: 'Auto-created' })
                    });
                  } catch (catErr) {
                    console.error("Failed to auto-create category", catErr);
                  }
                }

                const url = editingItem ? `/api/inventory/${editingItem.id}` : '/api/inventory';
                const method = editingItem ? 'PUT' : 'POST';
                const res = await fetchWithAuth(url, token, { method, body: JSON.stringify(data) });
                if (res) {
                   setShowForm(false);
                   setEditingItem(null);
                   loadData();
                }
             } catch (e) {
                console.error(e);
             }
          }}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
        
          </div>
        </div>
      )}

      {!showForm && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <th className="px-4 py-3">Item Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Base Price</th>
              <th className="px-4 py-3 text-right">Total Stock</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <Box className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">No items found in inventory.</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isLowStock = item.reorderPoint > 0 && (item.quantityInStock || 0) <= item.reorderPoint;
                return (
                  <React.Fragment key={item.id}>
                  <tr className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-amber-50/20' : ''}`}>
                    <td className="px-4 py-4 font-mono font-bold">{item.itemCode}</td>
                    <td className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{item.name}</span>
                        {item.isFixedAsset && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                            🏢 Fixed Asset
                          </span>
                        )}
                        {item.abcClassification && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[9px] font-mono font-bold">
                            Class {item.abcClassification}
                          </span>
                        )}
                        {isLowStock && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                            ⚠️ Low Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.category}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {item.isAdminItem && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">ADMIN</span>}
                        {item.isItItem && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">IT</span>}
                        {item.isFixedAsset && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">ASSET</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-700">
                      {item.basePrice ? `${currencySymbol}${Number(item.basePrice).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold">
                      <span className="text-brand-orange">{item.quantityInStock}</span> <span className="text-slate-500 text-xs">{item.uom}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-600">
                      {item.reservedQuantity || 0}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs font-bold uppercase">{item.location || '-'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowForm(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingItemId(viewingItemId === item.id ? null : item.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            viewingItemId === item.id ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          title="Attachments"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {viewingItemId === item.id && (
                    <tr>
                      <td colSpan={9} className="p-0 border-b border-slate-100 bg-slate-50">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                              <Paperclip className="w-4 h-4 text-blue-500" />
                              Item Attachments
                            </h4>
                            <button onClick={() => setViewingItemId(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <AttachmentPanel refType="Item" refId={item.id} compact />
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>

                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
        <BulkUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={loadData}
        />
      </div>
    </PageLayout>
  );
}
