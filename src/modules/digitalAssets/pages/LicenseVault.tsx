import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Shield, Search, Key, Link as LinkIcon, Eye, EyeOff, Lock, Users, Plus, X, Loader2 } from 'lucide-react';
import SearchableSelect from '@/src/shared/components/SearchableSelect';

export default function LicenseVault() {
  const { getToken, permissions, dbUser } = useAuth();
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const canViewVault = isSuperAdmin || permissions?.some((p: any) => p.module === 'License Vault' && p.canView);
  const canEdit = isSuperAdmin || permissions?.some((p: any) => p.module === 'License Vault' && p.canEdit);

  const [assets, setAssets] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: boolean }>({});
  
  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({ assignedUid: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [assetsRes, usersRes] = await Promise.all([
        fetchWithAuth('/api/digital-assets', token),
        fetchWithAuth('/api/users', token).catch(() => ({ users: [] }))
      ]);
      
      const vaultAssets = (Array.isArray(assetsRes) ? assetsRes : []).filter(a => a.licenseKeyEncrypted || a.portalUrl);
      
      // Load details for each vault asset
      const detailedAssets = await Promise.all(vaultAssets.map(async (a: any) => {
        try {
          const detail = await fetchWithAuth(`/api/digital-assets/${a.id}`, token);
          return detail;
        } catch(e) {
          return a;
        }
      }));

      setAssets(detailedAssets);
      setUsersList(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAssignClick = (asset: any) => {
    setSelectedAsset(asset);
    setAssignForm({ assignedUid: '', notes: '' });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !assignForm.assignedUid) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/digital-assets/${selectedAsset.id}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignedUid: assignForm.assignedUid,
          assignedAt: new Date(),
          notes: assignForm.notes
        })
      });

      if (!res.ok) throw new Error('Failed to assign user');
      await loadData();
      setShowAssignModal(false);
    } catch (err) {
      console.error(err);
      alert('Error assigning user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!window.confirm("Are you sure you want to revoke this user's access?")) return;
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/digital-assets/users/${userId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to revoke');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error revoking user');
    }
  };

  if (!canViewVault) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 mt-2">You do not have permission to view the License Vault.</p>
      </div>
    );
  }

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-rose-200">
            <Shield className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">License Vault</h1>
            <p className="text-sm text-slate-500 font-medium">Securely store and manage access to digital credentials</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search secure assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Key className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No secure credentials found in the vault</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {filteredAssets.map(asset => {
              const activeUsers = asset.users?.filter((u: any) => u.status === 'Active') || [];
              const isRevealed = revealedKeys[asset.id];
              return (
                <div key={asset.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-rose-200 transition-colors bg-white flex flex-col">
                  {/* Card Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{asset.name}</h3>
                      <p className="text-xs font-medium text-slate-500">{asset.assetType}</p>
                    </div>
                    <span className="inline-flex px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg border border-rose-100 uppercase tracking-wider">
                      Vault Item
                    </span>
                  </div>

                  {/* Credentials Section */}
                  <div className="p-5 space-y-4 flex-1">
                    {asset.portalUrl && (
                      <div className="flex items-start gap-3">
                        <LinkIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Portal URL</p>
                          <a href={asset.portalUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all">
                            {asset.portalUrl}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {asset.licenseKeyEncrypted && (
                      <div className="flex items-start gap-3">
                        <Key className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Key / Secret</p>
                            <button
                              onClick={() => toggleReveal(asset.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 text-xs font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {isRevealed ? 'Hide' : 'Reveal'}
                            </button>
                          </div>
                          <div className="bg-slate-900 rounded-lg p-3 relative overflow-hidden group">
                            <div className={`font-mono text-sm break-all ${isRevealed ? 'text-emerald-400' : 'text-slate-600 select-none'}`}>
                              {isRevealed ? asset.licenseKeyEncrypted : '••••••••••••••••••••••••••••••••'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Users Section */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Authorized Users ({activeUsers.length})
                      </h4>
                      {canEdit && (
                        <button
                          onClick={() => handleAssignClick(asset)}
                          className="text-xs font-bold text-brand-blue hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Assign
                        </button>
                      )}
                    </div>
                    {activeUsers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No users have been assigned access.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeUsers.map((user: any) => (
                          <div key={user.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                {user.userName?.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{user.userName}</span>
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => handleRevoke(user.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                title="Revoke Access"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign User Modal */}
      {showAssignModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-blue" />
                Assign Access
              </h3>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-4 sm:p-6 space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Asset</p>
                <p className="font-bold text-slate-900">{selectedAsset.name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select User <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={usersList.map(u => ({ value: u.uid, label: u.name }))}
                  value={assignForm.assignedUid}
                  onChange={val => setAssignForm({ ...assignForm, assignedUid: val })}
                  placeholder="Search user..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={assignForm.notes}
                  onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all min-h-[80px]"
                  placeholder="Reason for access..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !assignForm.assignedUid}
                  className="flex-1 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
