import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { Box, Plus, Search, Edit3, Filter, Shield, Loader2, ArrowLeft, Trash2, ShieldCheck, Cpu } from 'lucide-react';
import SearchableSelect from '@/src/shared/components/SearchableSelect';

export default function DigitalAssets() {
  const { getToken, permissions, dbUser } = useAuth();
  const currencySymbol = useCurrency();
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const canEdit = isSuperAdmin || permissions?.some((p: any) => p.module === 'Digital Asset Register' && p.canEdit);

  const [assets, setAssets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    assetType: 'Software License',
    vendorId: '',
    departmentId: '',
    custodianUid: '',
    licenseKeyEncrypted: '',
    portalUrl: '',
    activationDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    acquisitionCost: '',
    currency: 'BDT',
    status: 'Active',
    autoRenewal: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, vendorsRes, deptsRes, usersRes] = await Promise.all([
        fetchWithAuth('/api/digital-assets', token),
        fetchWithAuth('/api/vendors', token).catch(() => ({ vendors: [] })),
        fetchWithAuth('/api/departments', token).catch(() => ({ departments: [] })),
        fetchWithAuth('/api/users', token).catch(() => ({ users: [] }))
      ]);

      setAssets(Array.isArray(assetsRes) ? assetsRes : []);
      setVendors(vendorsRes.vendors || []);
      setDepartments(deptsRes.departments || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const url = editingAsset ? `/api/digital-assets/${editingAsset.id}` : '/api/digital-assets';
      const method = editingAsset ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save');
      await loadData();
      setShowForm(false);
      setEditingAsset(null);
    } catch (err) {
      console.error(err);
      alert('Error saving asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || '',
      assetType: asset.assetType || 'Software License',
      vendorId: asset.vendorId ? String(asset.vendorId) : '',
      departmentId: asset.departmentId ? String(asset.departmentId) : '',
      custodianUid: asset.custodianUid || '',
      licenseKeyEncrypted: asset.licenseKeyEncrypted || '',
      portalUrl: asset.portalUrl || '',
      activationDate: asset.activationDate ? asset.activationDate.slice(0, 10) : '',
      expiryDate: asset.expiryDate ? asset.expiryDate.slice(0, 10) : '',
      acquisitionCost: asset.acquisitionCost || '',
      currency: asset.currency || 'BDT',
      status: asset.status || 'Active',
      autoRenewal: asset.autoRenewal || false,
    });
    setShowForm(true);
  };

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.assetCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Expired': return 'bg-red-100 text-red-700';
      case 'Suspended': return 'bg-amber-100 text-amber-700';
      case 'Pending Renewal': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowForm(false); setEditingAsset(null); }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {editingAsset ? 'Edit Digital Asset' : 'Register Digital Asset'}
              </h2>
              <p className="text-sm text-slate-500">
                {editingAsset ? `Updating ${editingAsset.assetCode}` : 'Add a new software, license, or digital subscription'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            {/* Basic Info */}
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-brand-blue" />
                Asset Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Asset Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    placeholder="e.g. Adobe Creative Cloud"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Asset Type <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.assetType}
                    onChange={e => setFormData({ ...formData, assetType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  >
                    <option value="Software License">Software License</option>
                    <option value="SaaS Subscription">SaaS Subscription</option>
                    <option value="Cloud Service">Cloud Service</option>
                    <option value="Domain/Hosting">Domain / Hosting</option>
                    <option value="API Service">API Service</option>
                    <option value="Security Certificate">Security Certificate (SSL)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ownership & Links */}
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Ownership & Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor</label>
                  <SearchableSelect
                    options={vendors.map(v => ({ value: v.id.toString(), label: v.name }))}
                    value={formData.vendorId}
                    onChange={val => setFormData({ ...formData, vendorId: val })}
                    placeholder="Select Vendor..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Custodian (User)</label>
                  <SearchableSelect
                    options={users.map(u => ({ value: u.uid, label: u.name }))}
                    value={formData.custodianUid}
                    onChange={val => setFormData({ ...formData, custodianUid: val })}
                    placeholder="Select User..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Portal / Login URL</label>
                  <input
                    type="url"
                    value={formData.portalUrl}
                    onChange={e => setFormData({ ...formData, portalUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Financials & Validity */}
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-500" />
                Financials & Lifecycle
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Activation Date</label>
                  <input
                    type="date"
                    value={formData.activationDate}
                    onChange={e => setFormData({ ...formData, activationDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry / Renewal Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cost Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.acquisitionCost}
                    onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingAsset(null); }}
              className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingAsset ? 'Update Asset' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center shrink-0">
            <Box className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Digital Asset Register</h1>
            <p className="text-sm text-slate-500 font-medium">Manage all your software and digital subscriptions</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setFormData({ ...formData, name: '' }); setShowForm(true); }}
            className="px-4 py-2.5 bg-brand-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Box className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-sm font-medium">No digital assets found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{asset.name}</span>
                        <span className="text-xs text-slate-500 font-medium">{asset.assetCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{asset.assetType}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{asset.vendorName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">
                      {currencySymbol}{Number(asset.acquisitionCost).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(asset)}
                          className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit"
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
    </div>
  );
}
