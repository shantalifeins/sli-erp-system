import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Box, Plus, Search, Edit3, Filter, ArrowLeft, Building2, User, Calendar, QrCode, Zap, FileText } from 'lucide-react';

export default function Assets() {
  const navigate = useNavigate();
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const assetPerms = permissions?.find((p: any) => p.module === 'Assets Register') || {};
  const canCreate = isSuperAdmin || assetPerms.canCreate;
  const canEdit = isSuperAdmin || assetPerms.canEdit;
  const canApprove = isSuperAdmin || assetPerms.canApprove;

  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedQrAsset, setSelectedQrAsset] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    branchId: '',
    warehouseId: '',
    custodianUid: '',
    departmentId: '',
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: '',
    salvageValue: '0.00',
    depreciationMethod: 'Straight Line',
    decliningRate: '0.00',
    usefulLifeMonths: 36,
    serialNumber: '',
    status: 'Active'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, catRes, branchRes, deptRes, userRes] = await Promise.all([
        fetchWithAuth(`/api/assets?search=${encodeURIComponent(searchQuery)}&categoryId=${selectedCategory}&branchId=${selectedBranch}&status=${selectedStatus}`, token),
        fetchWithAuth('/api/assets/categories', token),
        fetchWithAuth('/api/branches', token).catch(() => ({ branches: [] })),
        fetchWithAuth('/api/departments', token).catch(() => ({ departments: [] })),
        fetchWithAuth('/api/users', token).catch(() => ({ users: [] }))
      ]);

      setAssetsList(assetsRes.assets || []);
      setCategories(catRes.categories || []);
      setBranches(branchRes.branches || branchRes || []);
      setDepartments(deptRes.departments || deptRes || []);
      setUsersList(userRes.users || userRes || []);
    } catch (err) {
      console.error('Failed to load asset register data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken, searchQuery, selectedCategory, selectedBranch, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      branchId: '',
      warehouseId: '',
      custodianUid: '',
      departmentId: '',
      acquisitionDate: new Date().toISOString().slice(0, 10),
      acquisitionCost: '',
      salvageValue: '0.00',
      depreciationMethod: 'Straight Line',
      decliningRate: '0.00',
      usefulLifeMonths: 36,
      serialNumber: '',
      status: 'Active'
    });
    setShowForm(true);
  };

  const handleOpenEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || '',
      categoryId: asset.categoryId || '',
      branchId: asset.branchId ? String(asset.branchId) : '',
      warehouseId: asset.warehouseId ? String(asset.warehouseId) : '',
      custodianUid: asset.custodianUid || '',
      departmentId: asset.departmentId ? String(asset.departmentId) : '',
      acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      acquisitionCost: asset.acquisitionCost || '',
      salvageValue: asset.salvageValue || '0.00',
      depreciationMethod: asset.depreciationMethod || 'Straight Line',
      decliningRate: asset.decliningRate || '0.00',
      usefulLifeMonths: asset.usefulLifeMonths || 36,
      serialNumber: asset.serialNumber || '',
      status: asset.status || 'Active'
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

      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';

      await fetchWithAuth(url, token, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      setShowForm(false);
      await loadData();
    } catch (err: any) {
      console.error('Save asset error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateAsset = async (assetId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth(`/api/assets/${assetId}/activate`, token, {
        method: 'POST'
      });
      await loadData();
    } catch (err: any) {
      console.error('Activate asset error:', err);
      alert(err.message || 'Failed to activate asset');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => showForm ? setShowForm(false) : navigate('/asset-dashboard')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title={showForm ? "Back to List" : "Back to Dashboard"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fixed Assets Register</h1>
            <p className="text-sm text-slate-500">Track company assets, custodians, location, and net book valuations</p>
          </div>
        </div>

        {!showForm && canCreate && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {showForm ? (
        /* Asset Registration / Edit Form */
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAsset ? `Edit Asset — ${editingAsset.assetCode}` : 'Register New Fixed Asset'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Asset Title / Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dell Latitude 7440 Laptop, Toyota Prado SUV"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Asset Category
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      categoryId: e.target.value,
                      depreciationMethod: cat?.defaultDepreciationMethod || formData.depreciationMethod,
                      decliningRate: cat?.defaultDecliningRate || formData.decliningRate,
                      usefulLifeMonths: cat?.defaultUsefulLifeMonths || formData.usefulLifeMonths
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Branch Location
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="">Unassigned / Corporate HQ</option>
                  {Array.isArray(branches) && branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Owning Department
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="">Select Department...</option>
                  {Array.isArray(departments) && departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Custodian Employee
                </label>
                <select
                  value={formData.custodianUid}
                  onChange={(e) => setFormData({ ...formData, custodianUid: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="">Unassigned Custodian</option>
                  {Array.isArray(usersList) && usersList.map((u: any) => (
                    <option key={u.uid || u.id} value={u.uid}>
                      {u.name || u.email} ({u.designation || u.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Acquisition Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.acquisitionDate}
                  onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Acquisition Cost ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formData.acquisitionCost}
                  onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Salvage Value ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salvageValue}
                  onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Depreciation Method
                </label>
                <select
                  required
                  value={formData.depreciationMethod}
                  onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="Straight Line">Straight Line</option>
                  <option value="Declining Balance">Declining Balance</option>
                  <option value="None">None (Non-Depreciating)</option>
                </select>
              </div>

              {formData.depreciationMethod === 'Declining Balance' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Annual Declining Rate (% per year)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.decliningRate}
                    onChange={(e) => setFormData({ ...formData, decliningRate: e.target.value })}
                    placeholder="0 = Auto (Double Declining)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave at 0 to use auto-calculated double declining rate.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Useful Life (Months)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.usefulLifeMonths}
                  onChange={(e) => setFormData({ ...formData, usefulLifeMonths: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Serial / Chassis Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="e.g. SN-88992211"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="UnderMaintenance">Under Maintenance</option>
                  <option value="Draft">Draft</option>
                  <option value="Disposed">Disposed</option>
                </select>
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
                {isSubmitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Register Asset'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Asset Register List Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, title, serial..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Branches</option>
                {Array.isArray(branches) && branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="UnderMaintenance">Under Maintenance</option>
                <option value="Draft">Draft</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tag Code</th>
                  <th className="px-6 py-4">Asset Description</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Location / Custodian</th>
                  <th className="px-6 py-4">Cost ({currencySymbol})</th>
                  <th className="px-6 py-4">Book Value ({currencySymbol})</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Loading asset records...
                    </td>
                  </tr>
                ) : assetsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No fixed assets found.
                    </td>
                  </tr>
                ) : (
                  assetsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-purple-600 text-xs">
                        {asset.assetCode}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{asset.name}</div>
                        {asset.serialNumber && (
                          <div className="text-xs text-slate-400">SN: {asset.serialNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {asset.categoryName || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        <div className="text-slate-700 font-medium flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {asset.branchName || 'HQ'}
                        </div>
                        <div className="text-slate-500 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {asset.custodianName || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {currencySymbol}{Number(asset.acquisitionCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        {currencySymbol}{Number(asset.currentBookValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          asset.status === 'UnderMaintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          asset.status === 'Disposed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        {asset.status === 'Draft' && (canApprove || canEdit) && (
                          <button
                            onClick={() => handleActivateAsset(asset.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2 border border-emerald-200"
                            title="Activate Asset & Generate Schedule"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/asset-schedule/${asset.id}`)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Depreciation Schedule"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedQrAsset(asset)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View / Print QR Tag Label"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(asset)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Asset"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showForm && Math.ceil(assetsList.length / itemsPerPage) > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, assetsList.length)}</span> of{' '}
            <span className="font-semibold text-slate-700">{assetsList.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2">
              Page {currentPage} of {Math.ceil(assetsList.length / itemsPerPage)}
            </span>
            <button
              disabled={currentPage === Math.ceil(assetsList.length / itemsPerPage)}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(assetsList.length / itemsPerPage)))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* QR Code Printable Label Modal */}
      {selectedQrAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-6 text-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Asset Identification Label
            </h3>

            {/* Printable Sticker Box */}
            <div id="printable-qr-label" className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-3">
              <div className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                Shanta Life Insurance PLC
              </div>
              <div className="flex justify-center py-1">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(selectedQrAsset.assetCode)}`} 
                  alt={selectedQrAsset.assetCode} 
                  className="w-32 h-32 border border-slate-200 p-1 bg-white rounded-lg shadow-sm"
                />
              </div>
              <div className="font-mono font-bold text-brand-orange text-base tracking-wider">
                {selectedQrAsset.assetCode}
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate px-2">
                {selectedQrAsset.name}
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between px-2 pt-1 border-t border-slate-200">
                <span>Cat: {selectedQrAsset.categoryName || '-'}</span>
                <span>Branch: {selectedQrAsset.branchName || 'HQ'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedQrAsset(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Print Sticker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
