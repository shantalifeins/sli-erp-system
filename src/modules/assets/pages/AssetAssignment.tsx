import React, { useEffect, useState } from 'react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { UserCheck, Plus, X, RotateCcw, Building2, User, Search, CheckCircle2, Briefcase } from 'lucide-react';

export default function AssetAssignment() {
  const { getToken, dbUser, permissions } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedUserUid, setSelectedUserUid] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const assignPerms = permissions?.find((p: any) => p.module === 'Asset Assignment') || {};
  const canCreate = isSuperAdmin || assignPerms.canCreate;
  const canEdit = isSuperAdmin || assignPerms.canEdit;

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const [assignRes, assetRes, userRes, deptRes, branchRes] = await Promise.allSettled([
        fetchWithAuth('/api/assets/assignments/list', token),
        fetchWithAuth('/api/assets', token),
        fetchWithAuth('/api/users', token),
        fetchWithAuth('/api/departments', token),
        fetchWithAuth('/api/branches', token),
      ]);

      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value?.assignments || []);
      }
      if (assetRes.status === 'fulfilled') {
        const list = Array.isArray(assetRes.value) ? assetRes.value : (assetRes.value?.assets || []);
        setAvailableAssets(list);
      }
      if (userRes.status === 'fulfilled') {
        setSystemUsers(Array.isArray(userRes.value) ? userRes.value : (userRes.value?.users || []));
      }
      if (deptRes.status === 'fulfilled') {
        setDepartmentsList(Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value?.departments || []));
      }
      if (branchRes.status === 'fulfilled') {
        setBranchesList(Array.isArray(branchRes.value) ? branchRes.value : (branchRes.value?.branches || []));
      }
    } catch (err) {
      console.error('Failed to load asset assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const activeAssignments = assignments.filter((a: any) => a.status === 'Active');
  const returnedAssignments = assignments.filter((a: any) => a.status === 'Returned');

  const filteredAssignments = assignments.filter((a: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.assetCode || '').toLowerCase().includes(q) ||
      (a.assetName || '').toLowerCase().includes(q) ||
      (a.assignedToName || '').toLowerCase().includes(q) ||
      (a.departmentName || '').toLowerCase().includes(q)
    );
  });

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      alert('Please select an asset to assign.');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        assetId: selectedAssetId,
        assignedToUid: selectedUserUid || null,
        departmentId: selectedDepartmentId ? Number(selectedDepartmentId) : null,
        branchId: selectedBranchId ? Number(selectedBranchId) : null,
        notes,
      };

      const res = await fetchWithAuth('/api/assets/assignments/assign', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        alert('Asset assignment created & custodian updated successfully!');
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        alert(res?.error || 'Failed to create asset assignment');
      }
    } catch (err: any) {
      console.error('Assignment submission error:', err);
      alert(err?.message || 'Error executing assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnAsset = async (assignmentId: string, assetCode: string) => {
    if (!window.confirm(`Are you sure you want to return asset ${assetCode} to unassigned inventory?`)) return;
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetchWithAuth(`/api/assets/assignments/${assignmentId}/return`, token, {
        method: 'POST',
      });

      if (res?.success) {
        alert('Asset successfully returned and marked unassigned!');
        loadData();
      } else {
        alert(res?.error || 'Failed to return asset');
      }
    } catch (err: any) {
      console.error('Asset return error:', err);
      alert(err?.message || 'Error processing return');
    }
  };

  const resetForm = () => {
    setSelectedAssetId('');
    setSelectedUserUid('');
    setSelectedDepartmentId('');
    setSelectedBranchId('');
    setNotes('');
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-50 rounded-lg text-pink-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Asset Assignment</h1>
              <p className="text-sm text-slate-500">Allocate fixed assets to employees, departments, or branches with real-time custodian sync.</p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Assign Asset
            </button>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Custodians</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeAssignments.length}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Currently assigned assets</p>
            </div>
            <div className="p-3 bg-pink-50 text-pink-600 rounded-lg">
              <User className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Assets</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {availableAssets.filter(a => !a.custodianUid).length}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Unassigned assets in inventory</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historical Transfers</p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">{returnedAssignments.length}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Completed assignment logs</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignment by Asset Code, Name, Custodian or Department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading asset assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-700 text-base">No asset assignments recorded</h3>
              <p className="text-slate-500 text-sm mt-1">Click "+ Assign Asset" to allocate a fixed asset to a custodian.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase text-xs">
                  <th className="p-4 font-semibold">Asset Code</th>
                  <th className="p-4 font-semibold">Asset Name</th>
                  <th className="p-4 font-semibold">Assigned Custodian</th>
                  <th className="p-4 font-semibold">Department</th>
                  <th className="p-4 font-semibold">Assigned Date</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-800">{row.assetCode}</td>
                    <td className="p-4 font-medium text-slate-800">{row.assetName}</td>
                    <td className="p-4 font-semibold text-pink-700">{row.assignedToName || 'Unassigned / Dept Only'}</td>
                    <td className="p-4 text-slate-600">{row.departmentName || 'General'}</td>
                    <td className="p-4 text-slate-500 text-xs">
                      {row.assignedAt ? new Date(row.assignedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        row.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {row.status === 'Active' && canEdit && (
                        <button
                          onClick={() => handleReturnAsset(row.id, row.assetCode)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Return Asset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Assign Asset Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-pink-600" /> Assign Asset to Custodian
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Asset <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full border rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  >
                    <option value="">Select an asset...</option>
                    {availableAssets.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.assetCode} — {a.name} ({a.custodianName ? `Current: ${a.custodianName}` : 'Unassigned'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Custodian (Employee)</label>
                  <select
                    value={selectedUserUid}
                    onChange={(e) => setSelectedUserUid(e.target.value)}
                    className="w-full border rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  >
                    <option value="">Select custodian user...</option>
                    {systemUsers.map((u: any) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name || u.email} ({u.designation || u.department || 'Employee'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="w-full border rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    >
                      <option value="">Select Department...</option>
                      {departmentsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full border rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    >
                      <option value="">Select Branch...</option>
                      {branchesList.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignment Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason, condition upon assignment, or special notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'Saving Assignment...' : 'Save & Assign Custodian'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
