import React, { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { Save, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useAuth } from '@/src/shared/components/AuthProvider';

const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="156" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

import { useNavigate, useSearchParams } from 'react-router-dom';


export default function WorkflowDesigner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useAuth();
  const workflowId = searchParams.get('id');
  
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('Item Requisition');
  const [department, setDepartment] = useState('Global');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!workflowId);
  const [existingDocTypes, setExistingDocTypes] = useState<string[]>([]);
  
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = await getToken();
        const [r, d, u, w] = await Promise.all([
          fetchWithAuth('/api/roles', token),
          fetchWithAuth('/api/designations', token),
          fetchWithAuth('/api/users', token),
          fetchWithAuth('/api/workflows', token)
        ]);
        setRoles(r.map((x: any) => x.name));
        setDesignations(d.map((x: any) => x.name));
        setUsers(u);
        const existing = w.map((x: any) => x.documentType);
        setExistingDocTypes(existing);
        
        if (!workflowId) {
          const availableOptions = ['Item Requisition', 'Purchase Requisition', 'CS Evaluation', 'Stock Out', 'Stock Transfer', 'User Registration', 'Profile Data Change Request'];
          const firstAvailable = availableOptions.find(opt => !existing.includes(opt));
          if (firstAvailable) {
            setDocumentType(firstAvailable);
          }
        }
      } catch (e) {
        console.error("Failed to load options", e);
      }
    };
    fetchOptions();
  }, [getToken]);

  useEffect(() => {
    if (containerRef.current && !modelerRef.current) {
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        // keyboard: { bindTo: document } // Removed because it's unsupported in newer versions
      });
      
      if (workflowId) {
        // Load existing workflow
        const loadExisting = async () => {
          try {
            const token = await getToken();
            const wf = await fetchWithAuth(`/api/workflows/${workflowId}`, token);
            setName(wf.name);
            setDocumentType(wf.documentType);
            setDepartment(wf.department);
            await modelerRef.current?.importXML(wf.xmlData);
          } catch (err: any) {
            console.error("Failed to load existing workflow", err);
            alert(`Failed to load workflow: ${err.message || err}`);
            modelerRef.current?.importXML(emptyBpmn).catch(console.error);
          } finally {
            setLoading(false);
          }
        };
        loadExisting();
      } else {
        modelerRef.current.importXML(emptyBpmn).catch(err => {
          console.error("Could not import BPMN 2.0 XML", err);
        });
      }
      
      modelerRef.current.on('selection.changed', (e: any) => {
        const newSelection = e.newSelection[0];
        setSelectedElement(newSelection || null);
        setAssigneeSearch('');
      });
    }

    return () => {
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
  }, [workflowId, getToken]);

  const handleSave = async () => {
    if (!modelerRef.current) return;
    try {
      setSaving(true);
      const token = await getToken();
      
      const { xml } = await modelerRef.current.saveXML({ format: true });
      
      await fetchWithAuth('/api/bpmn/definitions', token, {
        method: 'POST',
        body: JSON.stringify({
          name,
          documentType,
          department,
          xmlData: xml
        })
      });
      alert("BPMN Workflow saved successfully!");
      navigate('/admin?tab=workflows');
    } catch (err) {
      console.error(err);
      alert("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const updateProperty = (key: string, value: any) => {
    if (!selectedElement || !modelerRef.current) return;
    const modeling = modelerRef.current.get('modeling');
    const bpmnFactory = modelerRef.current.get('bpmnFactory');
    const bo = selectedElement.businessObject;

    if (key === 'assigneeType' || key === 'assigneeValue' || key === 'minAmount') {
      let currentDoc = {};
      try {
        const text = bo.documentation?.[0]?.text;
        if (text) currentDoc = JSON.parse(text);
      } catch(e) {}
      
      const newDocObj = { ...currentDoc, [key]: value };
      // Remove undefined keys
      if (value === undefined) delete newDocObj[key];
      
      const newDoc = bpmnFactory.create('bpmn:Documentation', { text: JSON.stringify(newDocObj) });
      modeling.updateProperties(selectedElement, { documentation: [newDoc] });
      
      // Update name if assigneeValue changes so it shows on canvas
      if (key === 'assigneeValue') {
        modeling.updateProperties(selectedElement, { name: value });
      }
    } else if (key === 'condition') {
      if (value) {
        const newCond = bpmnFactory.create('bpmn:FormalExpression', { body: value });
        modeling.updateProperties(selectedElement, { conditionExpression: newCond, name: value });
      } else {
        modeling.updateProperties(selectedElement, { conditionExpression: undefined, name: '' });
      }
    }
    
    // Force React to re-render the properties panel
    setRefreshKey(prev => prev + 1);
  };

  const getProperty = (key: string) => {
    if (!selectedElement) return '';
    const bo = selectedElement.businessObject;
    
    if (key === 'assigneeType' || key === 'assigneeValue' || key === 'minAmount') {
      try {
        const text = bo.documentation?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return parsed[key];
        }
      } catch(e) {}
      return key === 'minAmount' ? '' : '';
    } else if (key === 'condition') {
      return bo.conditionExpression?.body || '';
    }
    return '';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => navigate('/admin?tab=workflows')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workflow Name</label>
            <input 
              type="text" 
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-48 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Document Type</label>
            <select 
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-40 focus:border-brand-orange outline-none"
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
            >
              {['Item Requisition', 'Purchase Requisition', 'CS Evaluation', 'Stock Out', 'Stock Transfer', 'User Registration', 'Profile Data Change Request']
                .filter(opt => !existingDocTypes.includes(opt) || (workflowId && documentType === opt))
                .map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-brand-orange bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight">
              {documentType === 'Profile Data Change Request' && "Triggered when a user requests to update their profile data."}
              {documentType === 'User Registration' && "Triggered when a new user registers via SSO."}
              {documentType === 'Item Requisition' && "Triggered when an employee requests items. If out of stock, a PR is generated."}
              {documentType === 'Purchase Requisition' && "Triggered when requested items are out of stock. Required before generating CS or PO."}
              {documentType === 'CS Evaluation' && "Triggered for vendor selection. You can use gateways to route based on total amount."}
              {documentType === 'Stock Out' && "Triggered when items are issued. Ensures final approval before stock deduction."}
              {documentType === 'Stock Transfer' && "Triggered when transferring items between warehouses. Requires approval before stock is moved."}
              {documentType === 'User Registration' && "Triggered when a new user registers via SSO. Use this to design the onboarding approval chain."}
              {!['Item Requisition', 'Purchase Requisition', 'CS Evaluation', 'Stock Out', 'Stock Transfer', 'User Registration'].includes(documentType) && "Use 'User Task' and set ID to role name"}
            </span>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-charcoal hover:bg-brand-orange text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save XML Workflow'}
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* BPMN Canvas */}
        <div className="flex-1 relative bg-[#f8f9fa]">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-[#F37021] mb-2" />
              <p className="text-sm font-semibold text-slate-600">Loading Workflow...</p>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0" />
        </div>
        
        {/* Properties Panel */}
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-800">Properties Panel</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedElement ? `Editing: ${selectedElement.type.replace('bpmn:', '')}` : 'Select an element on the canvas'}
            </p>
          </div>
          
          <div className="p-4 flex flex-col gap-4">
            {!selectedElement && (
              <div className="text-sm text-slate-400 text-center py-8">
                Click on a node or flow to edit its properties.
              </div>
            )}
            
            {selectedElement?.type === 'bpmn:UserTask' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assignee Type</label>
                  <select 
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-brand-orange outline-none"
                    value={getProperty('assigneeType') || 'Role'}
                    onChange={e => {
                      const newType = e.target.value;
                      updateProperty('assigneeType', newType);
                      // Auto-set the value for Department Head so it doesn't need to be selected
                      if (newType === 'Department Head') {
                        updateProperty('assigneeValue', 'Department Head');
                      } else {
                        updateProperty('assigneeValue', '');
                      }
                      setAssigneeSearch('');
                    }}
                  >
                    <option value="Department Head">Department Head (Own Department)</option>
                    <option value="Role">Role (Global / General)</option>
                    <option value="Designation">Designation</option>
                    <option value="Specific User">Specific User</option>
                  </select>
                </div>
                
                {getProperty('assigneeType') !== 'Department Head' && (() => {
                  const type = getProperty('assigneeType');
                  let options: { value: string; labelOnly: string; subLabel: string; searchText: string }[] = [];
                  
                  if (type === 'Designation') {
                    options = designations.map(d => {
                      const assignedUsers = users.filter(u => u.designation === d);
                      const userNames = assignedUsers.length > 0 
                        ? assignedUsers.map(u => u.name).join(', ') 
                        : 'No users assigned';
                      return { 
                        value: d, 
                        labelOnly: d, 
                        subLabel: userNames, 
                        searchText: `${d} ${userNames}` 
                      };
                    });
                  } else if (type === 'Specific User') {
                    options = users.map(u => ({ 
                      value: u.uid, 
                      labelOnly: u.name, 
                      subLabel: u.email, 
                      searchText: `${u.name} ${u.email}` 
                    }));
                  } else {
                    options = roles.map(r => ({ 
                      value: r, 
                      labelOnly: r, 
                      subLabel: '', 
                      searchText: r 
                    }));
                  }
                  
                  const filtered = options.filter(opt => 
                    opt.searchText.toLowerCase().includes(assigneeSearch.toLowerCase())
                  );
                  
                  const currentValue = getProperty('assigneeValue') || '';
                  
                  return (
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Assign To</label>
                      <input 
                        type="text" 
                        placeholder="Type to search..." 
                        className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:border-brand-orange outline-none bg-slate-50"
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                      />
                      <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
                        {filtered.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">No results found</div>
                        ) : (
                          filtered.map(opt => {
                            const isSelected = currentValue === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateProperty('assigneeValue', opt.value)}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col ${
                                  isSelected 
                                    ? 'bg-orange-50 text-brand-orange font-semibold' 
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="break-words font-medium leading-normal">{opt.labelOnly}</span>
                                {opt.subLabel && (
                                  <span className={`text-[10px] ${isSelected ? 'text-orange-400' : 'text-slate-400'} mt-0.5 break-words`}>
                                    {opt.subLabel}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}


              </>
            )}
            
            {selectedElement?.type === 'bpmn:SequenceFlow' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Condition Expression</label>
                <div className="text-[10px] text-slate-400 mb-2">
                  Example: <code>amount &gt; 5000</code> or <code>department == 'IT'</code>
                </div>
                <textarea 
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-brand-orange outline-none font-mono"
                  rows={3}
                  placeholder="e.g. amount > 5000"
                  value={getProperty('condition')}
                  onChange={e => updateProperty('condition', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
