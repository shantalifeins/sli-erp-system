import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Tags, Plus, ArrowLeft, Upload } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import { ItemCategoryBulkUploadModal } from '../components/ItemCategoryBulkUploadModal';

export default function ItemCategories() {
  const { getToken, dbUser, permissions } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const inventoryPerms = permissions?.find((p: any) => p.module === 'Inventory Items') || {};
  const canCreate = isSuperAdmin || inventoryPerms.canCreate;

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadCategories = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/inventory/categories', token);
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth('/api/inventory/categories', token, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      setShowForm(false);
      setName('');
      setDescription('');
      loadCategories();
    } catch (error) {
      console.error("Failed to add category", error);
      alert("Failed to add category. It might already exist.");
    }
  };

  const filteredCategories = categories.filter(cat => 
    (cat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
    (cat.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout 
      loading={loading}
      search={{ placeholder: "Search categories...", onSearch: setSearchQuery }}
      pagination={showForm ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
      <div className="space-y-6 flex flex-col h-full">
        {!showForm && (
        <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Item Categories</h2>
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
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              Add Category
            </button>
          </div>
        )}
      </div>
      )}

      {showForm && canCreate && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">New Category</h3>
          </div>
          <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
              >
                Save Category
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
              <th className="px-4 py-3">Category Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <Tags className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">No categories found.</p>
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold">{cat.name}</td>
                  <td className="px-4 py-4 text-slate-600">{cat.description || '-'}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {cat.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
        <ItemCategoryBulkUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={loadCategories}
        />
      </div>
    </PageLayout>
  );
}


