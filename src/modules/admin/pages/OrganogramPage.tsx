import React, { useEffect, useState } from 'react';
import { Network, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { OrganogramNode, DepartmentNode } from '../components/OrganogramNode';
import { fetchWithAuth } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/components/AuthProvider';

export function OrganogramPage() {
  const { getToken } = useAuth();
  const [treeData, setTreeData] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetNode, setTargetNode] = useState<DepartmentNode | null>(null);
  const [newNodeType, setNewNodeType] = useState<'department' | 'unit'>('department');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCode, setNewNodeCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/admin/organogram/departments', token);
      if (data && data.tree) {
        setTreeData(data.tree);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organogram');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleAddChildClick = (node: DepartmentNode) => {
    setTargetNode(node);
    setNewNodeType('department');
    setNewNodeName('');
    setNewNodeCode('');
    setShowAddModal(true);
  };

  const handleSaveNewNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNode) return;
    
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      const endpoint = newNodeType === 'department' ? '/api/departments' : '/api/units';
      
      const payload: any = {
        name: newNodeName,
        code: newNodeCode,
      };

      if (newNodeType === 'department') {
        payload.parentId = targetNode.id;
      } else {
        payload.departmentId = targetNode.id;
      }

      await fetchWithAuth(endpoint, token, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Network className="w-6 h-6 text-brand-olive" />
            Organization Chart
          </h1>
          <p className="text-gray-500 mt-1">Hierarchical view of departments and units</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium w-12 text-center text-gray-600">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button 
            onClick={handleResetZoom}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto relative min-h-[600px] cursor-grab active:cursor-grabbing">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-olive"></div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-red-500 gap-4">
            <p>{error}</p>
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        ) : treeData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No departments found. Add departments to build the organization chart.
          </div>
        ) : (
          <div 
            className="absolute p-12 min-w-max min-h-max flex justify-center w-full transition-transform duration-200 origin-top"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="flex flex-row gap-16">
              {treeData.map((rootNode) => (
                <OrganogramNode key={`dept-${rootNode.id}`} node={rootNode} onAddChild={handleAddChildClick} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Entity Modal */}
      {showAddModal && targetNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Add to {targetNode.name}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveNewNode} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Entity Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="nodeType" 
                      value="department" 
                      checked={newNodeType === 'department'} 
                      onChange={() => setNewNodeType('department')} 
                      className="text-brand-orange focus:ring-brand-orange"
                    />
                    <span className="text-sm font-medium text-gray-700">Sub-Department</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="nodeType" 
                      value="unit" 
                      checked={newNodeType === 'unit'} 
                      onChange={() => setNewNodeType('unit')}
                      className="text-brand-orange focus:ring-brand-orange" 
                    />
                    <span className="text-sm font-medium text-gray-700">Unit</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                <input 
                  type="text"
                  required
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="e.g. IT Operations"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Code</label>
                <input 
                  type="text"
                  required
                  value={newNodeCode}
                  onChange={(e) => setNewNodeCode(e.target.value)}
                  placeholder="e.g. IT-OPS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-brand-orange hover:bg-[#e06214] rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
