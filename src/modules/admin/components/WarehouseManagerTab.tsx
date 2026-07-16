import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';

interface WarehouseManagerProps {
  searchQuery: string;
}

export function WarehouseManagerTab({ searchQuery }: WarehouseManagerProps) {
  const { getToken } = useAuth();
  const [managers, setManagers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ userId: '', warehouseId: '', itemType: 'Both' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [mRes, uRes, wRes] = await Promise.all([
        fetchWithAuth('/api/admin/warehouse-managers', token),
        fetchWithAuth('/api/users', token),
        fetchWithAuth('/api/warehouses', token)
      ]);

      setManagers(mRes || []);
      setUsers(uRes || []);
      setWarehouses(wRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (editingId) {
        await fetchWithAuth(`/api/admin/warehouse-managers/${editingId}`, token, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchWithAuth('/api/admin/warehouse-managers', token, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ userId: '', warehouseId: '', itemType: 'Both' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (m: any) => {
    setFormData({
      userId: m.userId,
      warehouseId: m.warehouseId.toString(),
      itemType: m.itemType
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this mapping?')) return;
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/admin/warehouse-managers/${id}`, token, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete mapping');
    }
  };

  const filteredManagers = managers.filter(m => 
    (m.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (m.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (m.itemType?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );
  const selectedUser = users.find(u => u.uid === formData.userId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">Warehouse Managers</h3>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setFormData({ userId: '', warehouseId: '', itemType: 'Both' });
            } else {
              setShowForm(true);
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214]"
        >
          <Plus className="-ml-1 mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'Add Mapping'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">User *</label>
              <div 
                className="w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white cursor-text flex items-center h-[38px]"
                onClick={() => setIsUserDropdownOpen(true)}
              >
                <input
                  type="text"
                  placeholder="Search user..."
                  value={isUserDropdownOpen ? userSearchTerm : (selectedUser ? `${selectedUser.name} (${selectedUser.email})` : '')}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    if (!isUserDropdownOpen) setIsUserDropdownOpen(true);
                  }}
                  onFocus={() => setIsUserDropdownOpen(true)}
                  className="w-full outline-none bg-transparent"
                  required={!formData.userId}
                />
              </div>
              {isUserDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setIsUserDropdownOpen(false); setUserSearchTerm(''); }} />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No users found</div>
                    ) : (
                      filteredUsers.map((u: any) => (
                        <div
                          key={u.uid}
                          className={`p-2 text-sm cursor-pointer hover:bg-slate-50 ${formData.userId === u.uid ? 'bg-orange-50 text-brand-orange' : 'text-slate-700'}`}
                          onClick={() => {
                            setFormData({ ...formData, userId: u.uid });
                            setUserSearchTerm('');
                            setIsUserDropdownOpen(false);
                          }}
                        >
                          {u.name} <span className="text-slate-400 text-xs">({u.email})</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Warehouse</label>
              <select
                required
                value={formData.warehouseId}
                onChange={e => setFormData({ ...formData, warehouseId: e.target.value })}
                className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm"
              >
                <option value="">Select Warehouse</option>
                {warehouses.filter((w: any) => w.status === 'Active').map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Type</label>
              <select
                required
                value={formData.itemType}
                onChange={e => setFormData({ ...formData, itemType: e.target.value })}
                className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm"
              >
                <option value="Both">Both</option>
                <option value="Admin">Admin</option>
                <option value="IT">IT</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ userId: '', warehouseId: '', itemType: 'Both' });
                }}
                className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-slate-50 flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] disabled:opacity-50">
                {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Save') + ' Mapping'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warehouse</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Type</th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredManagers.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                    {m.userName} <br />
                    <span className="text-xs text-slate-500 font-normal">{m.userEmail}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {m.warehouseName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      m.itemType === 'Admin' ? 'bg-blue-100 text-blue-700' :
                      m.itemType === 'IT' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {m.itemType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-slate-500 hover:text-brand-orange bg-slate-50 hover:bg-orange-50 p-2 rounded transition-colors mr-2"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredManagers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    No warehouse managers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
