import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Box, Plus, X, ArrowLeft, Upload, Paperclip } from 'lucide-react';
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const inventoryPerms = permissions?.find((p: any) => p.module === 'Inventory Items') || {};
  const canCreate = isSuperAdmin || inventoryPerms.canCreate;

  // Form State
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [uom, setUom] = useState('Pcs');
  const [location, setLocation] = useState('');
  const [isFixedAsset, setIsFixedAsset] = useState(false);
  const [assetCategoryId, setAssetCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [isAdminItem, setIsAdminItem] = useState(false);
  const [isItItem, setIsItItem] = useState(false);

  const findMatchingAssetCategory = (itemCatName: string, assetCats: any[]) => {
    if (!itemCatName || !assetCats || assetCats.length === 0) return '';
    const itemLower = itemCatName.toLowerCase();
    
    // Direct match or substring match
    const directMatch = assetCats.find(a => 
      a.name.toLowerCase() === itemLower ||
      a.name.toLowerCase().includes(itemLower) ||
      itemLower.includes(a.name.toLowerCase())
    );
    if (directMatch) return directMatch.id;

    // Word token match
    const tokens = itemLower.split(/[\s&,/]+/).filter(t => t.length > 2);
    for (const token of tokens) {
      const tokenMatch = assetCats.find(a => a.name.toLowerCase().includes(token));
      if (tokenMatch) return tokenMatch.id;
    }

    return assetCats[0]?.id || '';
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (isFixedAsset) {
      const matched = findMatchingAssetCategory(newCat, assetCategories);
      if (matched) setAssetCategoryId(matched);
    }
  };

  const handleFixedAssetToggle = (checked: boolean) => {
    setIsFixedAsset(checked);
    if (checked) {
      if (!assetCategoryId && category) {
        const matched = findMatchingAssetCategory(category, assetCategories);
        if (matched) setAssetCategoryId(matched);
      }
    } else {
      setAssetCategoryId('');
    }
  };

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [itemsData, catData, assetCatRes] = await Promise.all([
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/inventory/categories', token),
        fetchWithAuth('/api/assets/categories', token).catch(() => ({ categories: [] }))
      ]);
      setItems(itemsData);
      setCategories(catData);
      setAssetCategories(assetCatRes?.categories || assetCatRes || []);
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
    try {
      const token = await getToken();
      if (!token) return;

      // Auto-create category if it doesn't exist
      if (category && !categories.find(c => c.name.toLowerCase() === category.toLowerCase())) {
        try {
          await fetchWithAuth('/api/inventory/categories', token, {
            method: 'POST',
            body: JSON.stringify({ name: category, description: 'Auto-created' })
          });
        } catch (catErr) {
          console.error("Failed to auto-create category", catErr);
        }
      }

      await fetchWithAuth('/api/inventory', token, {
        method: 'POST',
        body: JSON.stringify({ itemCode, name, category, uom, location, isFixedAsset, assetCategoryId: isFixedAsset ? assetCategoryId : null, basePrice, isAdminItem, isItItem }),
      });
      setShowForm(false);
      setItemCode('');
      setName('');
      setCategory('');
      setIsNewCategory(false);
      setLocation('');
      setIsFixedAsset(false);
      setAssetCategoryId('');
      setBasePrice('');
      setIsAdminItem(false);
      setIsItItem(false);
      loadData();
    } catch (error) {
      console.error("Failed to add item", error);
    }
  };

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
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-xs transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              {showForm ? 'Cancel' : 'Add Item'}
            </button>
          </div>
        )}
      </div>
        )}

      {showForm && canCreate && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6 max-h-[85vh] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">New Inventory Item</h3>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
          
        <ItemForm
          initialData={{}} // We can wire this up properly later, for now just empty object since we don't have editingItem state setup
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

                const res = await fetchWithAuth('/api/inventory', token, { method: 'POST', body: JSON.stringify(data) });
                if (res) {
                   setShowForm(false);
                   loadData();
                }
             } catch (e) {
                console.error(e);
             }
          }}
          onCancel={() => setShowForm(false)}
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
                      <button
                        onClick={() => setViewingItemId(viewingItemId === item.id ? null : item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          viewingItemId === item.id ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                        }`}
                        title="Attachments"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
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
                          <AttachmentPanel refType="InventoryItem" refId={item.id} compact />
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
