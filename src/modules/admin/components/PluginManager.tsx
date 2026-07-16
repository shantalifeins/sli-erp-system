import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Box, Settings, Check, X, ShieldAlert, Info } from 'lucide-react';

const PLUGIN_RULES_SCHEMA: Record<string, any[]> = {
  'procurement': [
    { key: 'max_pr_amount', type: 'number', desc: 'Maximum allowed amount for a single Purchase Requisition.' },
    { key: 'require_qc', type: 'boolean', desc: 'Require Quality Control for all received items.' },
    { key: 'auto_approve_threshold', type: 'number', desc: 'Automatically approve PRs below this amount.' }
  ],
  'inventory': [
    { key: 'allow_negative_stock', type: 'boolean', desc: 'Allow stock to go below zero.' },
    { key: 'default_warehouse', type: 'string', desc: 'Default warehouse code for new stock.' }
  ],
  'hrms': [
    { key: 'max_leave_days', type: 'number', desc: 'Maximum consecutive leave days allowed.' },
    { key: 'auto_approve_leave', type: 'boolean', desc: 'Auto approve leaves if under limit.' }
  ]
};

export default function PluginManager({ companyId: propCompanyId, searchQuery = '' }: { companyId?: string, searchQuery?: string }) {
  const { getToken, dbUser } = useAuth();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve effective companyId: prop → localStorage activeTenantId → dbUser.company_id
  const activeTenantId = localStorage.getItem('activeTenantId');
  const companyId = propCompanyId
    || (activeTenantId && activeTenantId !== 'null' && activeTenantId !== 'undefined' ? activeTenantId : null)
    || dbUser?.company_id
    || '';

  const [editingSettings, setEditingSettings] = useState<any | null>(null);
  const [tempSettingsStr, setTempSettingsStr] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      
      const data = await fetchWithAuth(`/api/plugins/manage?companyId=${companyId}`, token);
      setPlugins(data.plugins || []);
    } catch (error) {
      console.error("Failed to load plugins:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadPlugins();
    }
  }, [getToken, companyId]);

  const togglePlugin = async (plugin: any) => {
    if (plugin.slug === 'admin') return; // Cannot toggle core admin
    
    const newStatus = plugin.status === 'active' ? 'inactive' : 'active';
    const originalStatus = plugin.status;
    
    // Optimistic UI update
    setPlugins(plugins.map(p => p.id === plugin.id ? { ...p, status: newStatus } : p));
    
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/plugins/manage/${plugin.id}/toggle?companyId=${companyId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      // Optionally trigger a full page reload or Auth sync to update navigation
      window.location.reload(); 
    } catch (error) {
      console.error("Toggle failed:", error);
      // Revert on fail
      setPlugins(plugins.map(p => p.id === plugin.id ? { ...p, status: originalStatus } : p));
      alert("Failed to toggle plugin.");
    }
  };

  const openSettings = (plugin: any) => {
    setEditingSettings(plugin);
    setTempSettingsStr(JSON.stringify(plugin.settings || {}, null, 2));
    setSaveStatus(null);
  };

  const saveSettings = async () => {
    try {
      setSaveStatus("Saving...");
      const parsedSettings = JSON.parse(tempSettingsStr);
      const token = await getToken();
      await fetchWithAuth(`/api/plugins/manage/${editingSettings.id}/settings?companyId=${companyId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ settings: parsedSettings })
      });
      
      setPlugins(plugins.map(p => p.id === editingSettings.id ? { ...p, settings: parsedSettings } : p));
      setSaveStatus("Saved successfully! Reloading...");
      setTimeout(() => {
        setEditingSettings(null);
        window.location.reload();
      }, 1000);
    } catch (error) {
      setSaveStatus(null);
      alert("Invalid JSON format or network error.");
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading plugins...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Box className="w-6 h-6 text-brand-orange" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Plugins & Modules</h3>
            <p className="text-sm text-slate-500">Enable or disable core modules for your enterprise and configure their specific business rules.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plugins
          .filter(plugin => 
            (plugin.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
            (plugin.slug?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
          )
          .map(plugin => (
          <div key={plugin.id} className={`bg-white border rounded-xl p-6 transition-all shadow-sm ${plugin.status === 'active' ? 'border-brand-orange/30 ring-1 ring-brand-orange/10' : 'border-slate-200 opacity-75'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plugin.status === 'active' ? 'bg-[#FFF3EC] text-[#F37021]' : 'bg-slate-100 text-slate-400'}`}>
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{plugin.name} {plugin.slug === 'admin' && <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 tracking-wider">CORE</span>}</h4>
                  <p className="text-xs text-slate-500 font-medium font-mono">v{plugin.version || '1.0.0'} • {plugin.slug}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {plugin.status === 'active' && plugin.slug !== 'admin' && (
                  <button onClick={() => openSettings(plugin)} className="p-2 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded-md transition-colors" title="Configure Rules">
                    <Settings className="w-5 h-5" />
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={plugin.status === 'active'}
                    disabled={plugin.slug === 'admin'}
                    onChange={() => togglePlugin(plugin)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2">{plugin.description}</p>
          </div>
        ))}
        {plugins.filter(plugin => (plugin.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || (plugin.slug?.toLowerCase().includes(searchQuery.toLowerCase()) || '')).length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-8 text-slate-500">
            No plugins found.
          </div>
        )}
      </div>

      {editingSettings && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-brand-orange" />
                  Configure Rules: {editingSettings.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Modify the JSON object below to update company policies.</p>
              </div>
              <button onClick={() => setEditingSettings(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex flex-col md:flex-row gap-6">
              
              <div className="flex-1">
                <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>JSON Settings Format</strong>
                    <p className="mt-1 opacity-90">Ensure valid JSON format (e.g. use double quotes for keys). Changes will take effect immediately for all users in your company.</p>
                  </div>
                </div>
                <textarea 
                  value={tempSettingsStr}
                  onChange={e => setTempSettingsStr(e.target.value)}
                  className="w-full h-64 font-mono text-sm p-4 bg-[#1E1E1E] text-[#D4D4D4] rounded-lg focus:ring-2 focus:ring-brand-orange focus:outline-none"
                  spellCheck={false}
                />
              </div>

              {/* Suggestions Panel */}
              <div className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg p-4 h-fit">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm">
                  <Info className="w-4 h-4 text-brand-orange" />
                  Available Rules
                </h4>
                {PLUGIN_RULES_SCHEMA[editingSettings.slug] ? (
                  <div className="space-y-4">
                    {PLUGIN_RULES_SCHEMA[editingSettings.slug].map((rule, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded p-2 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">"{rule.key}"</code>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{rule.type}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-tight">{rule.desc}</p>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        try {
                          const current = JSON.parse(tempSettingsStr);
                          const template: any = {};
                          PLUGIN_RULES_SCHEMA[editingSettings.slug].forEach(r => {
                            if (current[r.key] === undefined) {
                              template[r.key] = r.type === 'number' ? 0 : r.type === 'boolean' ? false : "";
                            }
                          });
                          setTempSettingsStr(JSON.stringify({ ...current, ...template }, null, 2));
                        } catch(e) {}
                      }}
                      className="w-full mt-2 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 rounded transition-colors"
                    >
                      Insert Missing Keys
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No predefined rules available for this module.</p>
                )}
              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center">
              <span className="text-sm font-bold text-emerald-600">{saveStatus}</span>
              <div className="flex gap-3">
                <button onClick={() => setEditingSettings(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors">
                  Cancel
                </button>
                <button onClick={saveSettings} disabled={saveStatus === "Saving..."} className="px-6 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {saveStatus === "Saving..." ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
