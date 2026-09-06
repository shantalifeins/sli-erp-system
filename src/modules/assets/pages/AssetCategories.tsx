import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Layers, Plus, Search, Edit3, Trash2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function AssetCategories() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    defaultDepreciationMethod: 'Straight Line',
    defaultUsefulLifeMonths: 36,
    defaultSalvagePercent: '0.00',
    fixedAssetAccount: '',
    depreciationAccount: '',
    expenseAccount: '',
    status: 'Active'
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/assets/categories', token);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load asset categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [getToken]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      defaultDepreciationMethod: 'Straight Line',
      defaultUsefulLifeMonths: 36,
      defaultSalvagePercent: '0.00',
      fixedAssetAccount: '',
      depreciationAccount: '',
      expenseAccount: '',
      status: 'Active'
    });
    setShowForm(true);
  };

  const handleOpenEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      code: category.code || '',
      defaultDepreciationMethod: category.defaultDepreciationMethod || 'Straight Line',
      defaultUsefulLifeMonths: category.defaultUsefulLifeMonths || 36,
      defaultSalvagePercent: category.defaultSalvagePercent || '0.00',
      fixedAssetAccount: category.fixedAssetAccount || '',
      depreciationAccount: category.depreciationAccount || '',
      expenseAccount: category.expenseAccount || '',
      status: category.status || 'Active'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const url = editingCategory
        ? `/api/assets/categories/${editingCategory.id}`
        : '/api/assets/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      await fetchWithAuth(url, token, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      setShowForm(false);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this asset category?')) return;
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth(`/api/assets/categories/${id}`, token, { method: 'DELETE' });
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          {showForm && (
            <button
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Asset Categories</h1>
            <p className="text-sm text-slate-500">Configure fixed asset categories, depreciation rules, and GL accounts</p>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {showForm ? (
        /* Category Add / Edit Form */
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingCategory ? 'Edit Asset Category' : 'Create New Asset Category'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. IT Equipment, Office Furniture"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Category Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CAT-IT, CAT-VEH"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Default Depreciation Method
                </label>
                <select
                  required
                  value={formData.defaultDepreciationMethod}
                  onChange={(e) => setFormData({ ...formData, defaultDepreciationMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                >
                  <option value="Straight Line">Straight Line</option>
                  <option value="Declining Balance">Declining Balance</option>
                  <option value="None">None (Non-Depreciating)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Default Useful Life (Months)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.defaultUsefulLifeMonths}
                  onChange={(e) => setFormData({ ...formData, defaultUsefulLifeMonths: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Default Salvage Value %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.defaultSalvagePercent}
                  onChange={(e) => setFormData({ ...formData, defaultSalvagePercent: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Fixed Asset GL Account
                </label>
                <input
                  type="text"
                  value={formData.fixedAssetAccount}
                  onChange={(e) => setFormData({ ...formData, fixedAssetAccount: e.target.value })}
                  placeholder="e.g. 15000-IT-EQUIPMENT"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Accumulated Depreciation GL Account
                </label>
                <input
                  type="text"
                  value={formData.depreciationAccount}
                  onChange={(e) => setFormData({ ...formData, depreciationAccount: e.target.value })}
                  placeholder="e.g. 15500-ACCUM-DEP-IT"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Categories List Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Search Filter Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories by name or code..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Depreciation Method</th>
                  <th className="px-6 py-4">Useful Life</th>
                  <th className="px-6 py-4">Salvage %</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Loading categories...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      No asset categories found. Click "Add Category" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600 text-xs">
                        {cat.code}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {cat.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cat.defaultDepreciationMethod}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cat.defaultUsefulLifeMonths} Months ({Math.round(cat.defaultUsefulLifeMonths / 12 * 10) / 10} Yrs)
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cat.defaultSalvagePercent}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          cat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {cat.status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {cat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
