import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import {
  MapPin, Plus, Search, Edit3, Trash2, ChevronRight, ChevronDown,
  Building2, FolderOpen, Folder, CheckCircle2, XCircle, X, Save
} from 'lucide-react';

interface Location {
  id: string;
  companyId: string;
  branchId: number | null;
  branchName: string | null;
  parentId: string | null;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  status: string;
}

interface TreeNode extends Location {
  children: TreeNode[];
}

export default function AssetLocation() {
  const { getToken, dbUser, permissions } = useAuth();
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const perms = permissions?.find((p: any) => p.module === 'Asset Location') || {};
  const canCreate = isSuperAdmin || perms.canCreate;
  const canEdit = isSuperAdmin || perms.canEdit;
  const canDelete = isSuperAdmin || perms.canDelete;

  const [locations, setLocations] = useState<Location[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    branchId: '',
    parentId: '',
    name: '',
    description: '',
    status: 'Active'
  });

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      
      const [locResult, branchResult] = await Promise.allSettled([
        fetchWithAuth('/api/assets/locations', token),
        fetchWithAuth('/api/branches', token)
      ]);

      if (locResult.status === 'fulfilled') {
        setLocations(locResult.value?.locations || []);
      } else {
        console.error('Failed to load asset locations:', locResult.reason);
      }

      if (branchResult.status === 'fulfilled') {
        const val = branchResult.value;
        const branchList = Array.isArray(val) ? val : (val?.branches || val?.data || []);
        setBranches(branchList);
      } else {
        console.error('Failed to load branches:', branchResult.reason);
      }
    } catch (err) {
      console.error('Failed to load locations or branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [getToken]);

  // Build tree from flat list
  const tree = useMemo(() => {
    const map: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    locations.forEach(loc => {
      map[loc.id] = { ...loc, children: [] };
    });

    locations.forEach(loc => {
      if (loc.parentId && map[loc.parentId]) {
        map[loc.parentId].children.push(map[loc.id]);
      } else {
        roots.push(map[loc.id]);
      }
    });

    return roots;
  }, [locations]);

  // Filtered tree based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.branchName || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q)
    );
  }, [locations, searchQuery]);

  const handleOpenCreate = (parentId?: string, branchId?: number) => {
    setEditingLocation(null);
    setFormData({
      branchId: branchId ? String(branchId) : '',
      parentId: parentId || '',
      name: '',
      description: '',
      status: 'Active'
    });
    setShowForm(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({
      branchId: loc.branchId ? String(loc.branchId) : '',
      parentId: loc.parentId || '',
      name: loc.name,
      description: loc.description || '',
      status: loc.status
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        branchId: formData.branchId ? Number(formData.branchId) : null,
        parentId: formData.parentId || null,
        name: formData.name.trim(),
        description: formData.description || null,
        status: formData.status
      };

      if (editingLocation) {
        await fetchWithAuth(`/api/assets/locations/${editingLocation.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchWithAuth('/api/assets/locations', token, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowForm(false);
      setEditingLocation(null);
      await loadData();
      // Auto-expand parent if adding sub-location
      if (payload.parentId) {
        setExpandedNodes(prev => new Set([...prev, payload.parentId as string]));
      }
    } catch (err) {
      console.error('Failed to save location:', err);
      alert('Failed to save location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetchWithAuth(`/api/assets/locations/${id}`, token, { method: 'DELETE' });
      if (res.error) {
        alert(res.error);
        return;
      }
      setDeletingId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete location.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = locations.filter(l => locations.some(c => c.parentId === l.id)).map(l => l.id);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => setExpandedNodes(new Set());

  // Render tree node recursively
  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const parentBranch = branches.find(b => b.id === node.branchId);

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all hover:bg-slate-50 ${depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4' : ''}`}
          style={{ marginLeft: depth * 20 }}
        >
          {/* Expand/Collapse toggle */}
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={`w-5 h-5 flex items-center justify-center text-slate-400 flex-shrink-0 ${hasChildren ? 'hover:text-slate-600 cursor-pointer' : 'cursor-default'}`}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-3 h-px bg-slate-300 block" />
            )}
          </button>

          {/* Icon */}
          <div className={`flex-shrink-0 ${depth === 0 ? 'text-indigo-500' : 'text-slate-400'}`}>
            {depth === 0 ? <Building2 size={16} /> : (hasChildren ? <FolderOpen size={15} /> : <MapPin size={14} />)}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-slate-800 ${depth === 0 ? 'text-sm' : 'text-sm'}`}>
                {node.name}
              </span>
              {node.branchName && depth === 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold border border-indigo-100">
                  {node.branchName}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${node.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                {node.status}
              </span>
              {node.children.length > 0 && (
                <span className="text-[10px] text-slate-400">{node.children.length} sub-location{node.children.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{node.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <button
                onClick={() => handleOpenCreate(node.id, node.branchId ?? undefined)}
                title="Add sub-location"
                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Plus size={13} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => handleOpenEdit(node)}
                title="Edit"
                className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Edit3 size={13} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setDeletingId(node.id)}
                title="Delete"
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Flat search results view
  const renderFlatResults = () => (
    <div className="space-y-1">
      {filteredLocations.map(loc => {
        const parentLoc = locations.find(l => l.id === loc.parentId);
        return (
          <div key={loc.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-all">
            <MapPin size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-800 text-sm">{loc.name}</span>
                {loc.branchName && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold">{loc.branchName}</span>
                )}
                {parentLoc && (
                  <span className="text-[10px] text-slate-400">under {parentLoc.name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button onClick={() => handleOpenEdit(loc)} className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  <Edit3 size={13} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => setDeletingId(loc.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const totalCount = locations.length;
  const activeCount = locations.filter(l => l.status === 'Active').length;
  const parentCount = locations.filter(l => !l.parentId).length;
  const subCount = locations.filter(l => !!l.parentId).length;

  const canView = isSuperAdmin || (perms as any).canView;
  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Access Denied</p>
          <p className="text-slate-400 text-sm">You don't have permission to view Asset Locations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Asset Location</h1>
            <p className="text-xs text-slate-500">Manage office and branch-wise location hierarchy</p>
          </div>
        </div>
        {canCreate && (
          <button
            id="add-location-btn"
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Add Location
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Locations', value: totalCount, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active', value: activeCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Top-Level', value: parentCount, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Sub-Locations', value: subCount, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-3 border border-white shadow-sm`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="location-search"
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50"
            />
          </div>
          {!searchQuery && (
            <>
              <button
                onClick={expandAll}
                className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                Collapse All
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-16">
              <MapPin size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No locations yet</p>
              <p className="text-slate-400 text-sm mb-4">Start by adding an office or branch location</p>
              {canCreate && (
                <button
                  onClick={() => handleOpenCreate()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={15} />
                  Add First Location
                </button>
              )}
            </div>
          ) : searchQuery.trim() ? (
            filteredLocations.length === 0 ? (
              <div className="text-center py-12">
                <Search size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No locations found for "{searchQuery}"</p>
              </div>
            ) : renderFlatResults()
          ) : (
            <div className="space-y-1">
              {tree.map(node => renderNode(node))}
            </div>
          )}
        </div>
      </div>

      {/* ================== FORM MODAL ================== */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <MapPin size={16} className="text-indigo-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingLocation ? 'Edit Location' : 'Add Location'}
                </h2>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingLocation(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Location Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Location Name
                </label>
                <input
                  id="location-name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Head Office, Kitchen, CEO's Office"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Office / Branch
                </label>
                <select
                  id="location-branch-select"
                  value={formData.branchId}
                  onChange={e => setFormData(f => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="">— No Branch (General) —</option>
                  {branches.filter(b => !b.status || (b.status !== 'Inactive' && b.status !== 'inactive')).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Parent Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Parent Location <span className="text-slate-400 font-normal">(optional — for sub-locations)</span>
                </label>
                <select
                  id="location-parent-select"
                  value={formData.parentId}
                  onChange={e => setFormData(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
                >
                  <option value="">— Top-Level Location —</option>
                  {locations
                    .filter(l => !l.parentId && l.id !== editingLocation?.id)
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.branchName ? ` (${l.branchName})` : ''}</option>
                    ))
                  }
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="location-description"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this location..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <div className="flex gap-3">
                  {['Active', 'Inactive'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.status === s
                          ? s === 'Active'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                            : 'bg-slate-100 border-slate-400 text-slate-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingLocation(null); }}
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="location-save-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Save size={14} />
                      {editingLocation ? 'Update' : 'Save Location'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================== DELETE CONFIRM MODAL ================== */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Delete Location?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This action cannot be undone. Locations with sub-locations cannot be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-location-btn"
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
