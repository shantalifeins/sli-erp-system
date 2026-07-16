import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { GitBranch, Plus, Edit, MapPin, Phone, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';

export default function BranchManager({ searchQuery = '' }: { searchQuery?: string }) {
  const { getToken, dbUser, permissions: userPerms } = useAuth();
  
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const hasPerm = (moduleName: string, action: 'canCreate' | 'canEdit' | 'canDelete') => {
    if (isSuperAdmin) return true;
    const p = userPerms?.find((p: any) => p.module === moduleName);
    return p ? p[action] : false;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Field States
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // Derive form state from searchParams
  const action = searchParams.get('action');
  const editIdStr = searchParams.get('id');
  const editingBranchId = editIdStr ? parseInt(editIdStr) : null;
  const showForm = action === 'new' || action === 'edit';

  const loadBranches = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/branches', token);
      setBranches(data || []);
      
      // If editing is requested, pre-fill details from loaded data
      if (action === 'edit' && editingBranchId) {
        const branchToEdit = (data || []).find((b: any) => b.id === editingBranchId);
        if (branchToEdit) {
          setName(branchToEdit.name);
          setAddress(branchToEdit.address || '');
          setContactNumber(branchToEdit.contactNumber || '');
        }
      }
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [getToken, action, editIdStr]);

  const handleEdit = (branch: any) => {
    setSearchParams({ tab: 'branches', action: 'edit', id: String(branch.id) });
  };

  const handleCreateNew = () => {
    setName('');
    setAddress('');
    setContactNumber('');
    setSearchParams({ tab: 'branches', action: 'new' });
  };

  const handleCancel = () => {
    setSearchParams({ tab: 'branches' });
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const token = await getToken();
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await fetchWithAuth(`/api/branches/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadBranches();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    try {
      const token = await getToken();
      
      if (!editingBranchId) {
        // Create new branch
        await fetchWithAuth('/api/branches', token, {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), address: address.trim(), contactNumber: contactNumber.trim() })
        });
      } else {
        // Update existing branch
        await fetchWithAuth(`/api/branches/${editingBranchId}`, token, {
          method: 'PUT',
          body: JSON.stringify({ name: name.trim(), address: address.trim(), contactNumber: contactNumber.trim() })
        });
      }

      await loadBranches();
      setSearchParams({ tab: 'branches' });
    } catch (error) {
      alert("Failed to save branch details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading branches...</div>;

  return (
    <div className="space-y-6 flex flex-col h-full">
      {!showForm && (
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-brand-orange" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Branches</h3>
            <p className="text-sm text-slate-500">Manage company branches and locations.</p>
          </div>
        </div>
        {hasPerm('Branches', 'canCreate') && (
          <button 
            onClick={() => {
              if (showForm) {
                handleCancel();
              } else {
                handleCreateNew();
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" /> 
            {showForm ? 'Cancel' : 'Add Branch'}
          </button>
        )}
      </div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <button onClick={handleCancel} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-slate-800">
              {editingBranchId ? 'Edit Branch' : 'New Branch'}
            </h4>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Branch Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Dhaka Branch" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Number</label>
                <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+880 123..." className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={submitting}
                className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Branch'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Branch Name</th>
              <th className="px-6 py-4">Contact Details</th>
              <th className="px-6 py-4 text-center">Status</th>
              {hasPerm('Branches', 'canEdit') && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {branches
              .filter(branch => 
                (branch.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
                (branch.address?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
                (branch.contactNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
              )
              .map((branch) => (
              <tr key={branch.id} className={cn("hover:bg-slate-50 transition-colors group", branch.status === 'Inactive' && "opacity-60 bg-slate-50/50")}>
                <td className="px-6 py-4 font-bold text-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    {branch.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {branch.contactNumber && <div>{branch.contactNumber}</div>}
                  {branch.address && <div className="text-slate-400 mt-0.5">{branch.address}</div>}
                  {!branch.contactNumber && !branch.address && <span className="italic text-slate-300">No details</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn("px-2 py-1 rounded text-xs font-bold", branch.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200')}>
                    {branch.status || 'Active'}
                  </span>
                </td>
                {hasPerm('Branches', 'canEdit') && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(branch.id, branch.status || 'Active')}
                        className={cn("px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm", branch.status === 'Active' ? 'bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200' : 'bg-emerald-500 text-white hover:bg-emerald-600')}
                      >
                        {branch.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => handleEdit(branch)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-brand-orange transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {branches.filter(branch => (branch.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (branch.address?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (branch.contactNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '')).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No branches found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
