import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Warehouse, Plus, Edit, MapPin, Check, GitBranch, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';

export default function WarehouseManager() {
  const { getToken, dbUser, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Field States
  const [name, setName] = useState('');
  const [locationField, setLocationField] = useState('');
  const [branchId, setBranchId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const inventoryPerms = permissions?.find((p: any) => p.module === 'Warehouses') || {};
  const canCreate = isSuperAdmin || inventoryPerms.canCreate;
  const canEdit = isSuperAdmin || inventoryPerms.canEdit;

  // Derive form state from searchParams
  const action = searchParams.get('action');
  const editIdStr = searchParams.get('id');
  const editingWarehouseId = editIdStr ? parseInt(editIdStr) : null;
  const showForm = action === 'new' || action === 'edit';

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [wData, bData] = await Promise.all([
        fetchWithAuth('/api/warehouses', token),
        fetchWithAuth('/api/branches', token)
      ]);

      setWarehouses(wData || []);
      setBranches((bData || []).filter((b: any) => b.status === 'Active'));

      // Pre-fill details if edit requested
      if (action === 'edit' && editingWarehouseId) {
        const warehouseToEdit = (wData || []).find((w: any) => w.id === editingWarehouseId);
        if (warehouseToEdit) {
          setName(warehouseToEdit.name);
          setLocationField(warehouseToEdit.location || '');
          setBranchId(String(warehouseToEdit.branchId));
        }
      }
    } catch (error) {
      console.error("Failed to load warehouses data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken, action, editIdStr]);

  const handleEdit = (warehouse: any) => {
    setSearchParams({ action: 'edit', id: String(warehouse.id) });
  };

  const handleCreateNew = () => {
    setName('');
    setLocationField('');
    setBranchId(branches[0]?.id ? String(branches[0].id) : '');
    setSearchParams({ action: 'new' });
  };

  const handleCancel = () => {
    setSearchParams({});
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const token = await getToken();
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await fetchWithAuth(`/api/warehouses/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (error) {
      console.error("Failed to update warehouse status:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branchId) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      
      const payload = {
        name: name.trim(),
        location: locationField.trim(),
        branchId: parseInt(branchId)
      };

      if (!editingWarehouseId) {
        await fetchWithAuth('/api/warehouses', token, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchWithAuth(`/api/warehouses/${editingWarehouseId}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      await loadData();
      setSearchParams({});
    } catch (error) {
      alert("Failed to save warehouse details.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses.filter(w => 
    (w.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (w.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (w.location?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );

  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const paginatedWarehouses = filteredWarehouses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search warehouses...", onSearch: setSearchQuery }}
      pagination={showForm ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
      <div className="space-y-6 flex flex-col h-full">
        {!showForm && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Warehouses</h2>
          {canCreate && (
            <button 
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" /> 
              Add Warehouse
            </button>
          )}
        </div>
        )}

        {showForm && (canCreate || canEdit) && (
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <button onClick={handleCancel} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">
                {editingWarehouseId ? 'Edit Warehouse' : 'New Warehouse'}
              </h3>
            </div>
            <div className="p-6">
            
            <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Warehouse Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Central Depot" className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Branch *</label>
                  <select 
                    value={branchId} 
                    onChange={e => setBranchId(e.target.value)} 
                    required 
                    className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white text-slate-700"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Address</label>
                  <input type="text" value={locationField} onChange={e => setLocationField(e.target.value)} placeholder="e.g. Plot 4, Road 12, Banani" className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Warehouse'}
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {!showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto shadow-sm flex-1 min-h-0">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">Status</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {paginatedWarehouses.map((w) => (
                <tr key={w.id} className={cn("hover:bg-slate-50 transition-colors group", w.status === 'Inactive' && "opacity-60 bg-slate-50/50")}>
                  <td className="px-4 py-4 font-bold text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      {w.name}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-medium">
                    {w.branchName}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">
                    {w.location || <span className="italic text-slate-300">No location</span>}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn("px-2 py-1 rounded text-xs font-bold", w.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200')}>
                      {w.status || 'Active'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(w.id, w.status || 'Active')}
                          className={cn("px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm", w.status === 'Active' ? 'bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200' : 'bg-emerald-500 text-white hover:bg-emerald-600')}
                        >
                          {w.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleEdit(w)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-brand-orange transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedWarehouses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No warehouses found.</td>
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
