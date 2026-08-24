import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import PageLayout from '@/src/shared/components/PageLayout';
import { Inbox as InboxIcon, Archive, Clock, CheckCircle2, ChevronRight, Filter, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import SearchableSelect from '@/src/shared/components/SearchableSelect';

export default function Inbox() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const currencySymbol = useCurrency();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'Archived'>('Pending');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // PR task review states
  const [selectedPr, setSelectedPr] = useState<any | null>(null);
  const [selectedStockOut, setSelectedStockOut] = useState<any | null>(null);
  const [selectedCs, setSelectedCs] = useState<any | null>(null);
  const [selectedSt, setSelectedSt] = useState<any | null>(null);
  const [selectedSsoUser, setSelectedSsoUser] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<'Approved' | 'Rejected' | 'Review' | null>(null);
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedProfileChange, setSelectedProfileChange] = useState<any | null>(null);
  const [profileChangeEdit, setProfileChangeEdit] = useState<any>({});

  
  // For SSO User Approval
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');

  const handleTaskClick = async (task: any) => {
    if (task.referenceType === 'PR') {
      try {
        const token = await getToken();
        // Fetch the specific PR details
        const prs = await fetchWithAuth('/api/pr', token);
        const match = prs.find((p: any) => p.id === task.referenceId);
        if (match) {
          setSelectedPr(match);
          setSelectedTask(task);
        } else {
          alert("Could not load details. It might have been already approved or rejected.");
        }
      } catch (error) {
        console.error("Failed to load PR details:", error);
      }
    } else if (task.referenceType === 'StockOut') {
      try {
        const token = await getToken();
        const sos = await fetchWithAuth('/api/inventory/stock-out', token);
        const match = sos.find((s: any) => s.id === task.referenceId);
        if (match) {
          setSelectedStockOut(match);
          setSelectedTask(task);
        } else {
          alert("Could not load Stock Out details.");
        }
      } catch (error) {
        console.error("Failed to load Stock Out details:", error);
      }
    } else if (task.referenceType === 'CS') {
      try {
        const token = await getToken();
        const css = await fetchWithAuth('/api/cs', token);
        const match = css.find((c: any) => c.id === task.referenceId);
        if (match) {
          setSelectedCs(match);
          setSelectedTask(task);
        } else {
          alert("Could not load CS details.");
        }
      } catch (error) {
        console.error("Failed to load CS details:", error);
      }
    } else if (task.referenceType === 'ST') {
      try {
        const token = await getToken();
        const sts = await fetchWithAuth('/api/stock-transfers', token);
        const match = sts.find((s: any) => s.id === task.referenceId);
        if (match) {
          setSelectedSt(match);
          setSelectedTask(task);
        } else {
          alert("Could not load Stock Transfer details.");
        }
      } catch (error) {
        console.error("Failed to load Stock Transfer details:", error);
      }
    } else if (task.referenceType === 'User Registration') {
      try {
        const token = await getToken();
        const users = await fetchWithAuth('/api/users', token);
        const match = users.find((u: any) => u.id === task.referenceId);
        if (match) {
          setSelectedSsoUser(match);
          setSelectedTask(task);
          
          // Fetch roles, branches, departments, designations
          const [rolesData, branchesData, departmentsData, designationsData, usersData] = await Promise.all([
            fetchWithAuth('/api/roles', token),
            fetchWithAuth('/api/branches', token),
            fetchWithAuth('/api/departments', token),
            fetchWithAuth('/api/designations', token),
            fetchWithAuth('/api/users?status=Active', token)
          ]);
          setRoles(rolesData || []);
          setBranches(branchesData || []);
          setDepartments(departmentsData || []);
          setDesignations(designationsData || []);
          setUsers(usersData || []);
        } else {
          alert("Could not load User details.");
        }
      } catch (error) {
        console.error("Failed to load User Registration details:", error);
      }
    } else if (task.referenceType === 'Profile Data Change Request') {
      try {
        const token = await getToken();
        const res = await fetchWithAuth(`/api/profile/change-request/${task.referenceId}`, token);
        if (res && res.request) {
          setSelectedProfileChange(res);
          setProfileChangeEdit(res.request.requestedData || {});
          setSelectedTask(task);
          
          const [rolesData, branchesData, departmentsData, designationsData] = await Promise.all([
            fetchWithAuth('/api/roles', token),
            fetchWithAuth('/api/branches', token),
            fetchWithAuth('/api/departments', token),
            fetchWithAuth('/api/designations', token)
          ]);
          setRoles(rolesData || []);
          setBranches(branchesData || []);
          setDepartments(departmentsData || []);
          setDesignations(designationsData || []);
        } else {
          alert("Could not load Profile Change details.");
        }
      } catch (error) {
        console.error("Failed to load Profile Change details:", error);
      }
    } else {
      if (task.actionLink) {
        navigate(task.actionLink);
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/inbox', token);
      setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const updateTaskStatus = async (id: number, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth(`/api/inbox/${id}/status`, token, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      loadData();
    } catch (error: any) {
      alert("Error updating task: " + error.message);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (t.status !== activeTab) return false;
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && 
          !t.message?.toLowerCase().includes(q) && 
          !t.category?.toLowerCase().includes(q) &&
          !t.referenceId?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = tasks.filter(t => t.status === 'Pending').length;

  return (
    <PageLayout loading={loading} search={{ placeholder: "Search inbox tasks...", onSearch: setSearchQuery }}>
      {!selectedPr && !selectedStockOut && !selectedCs && !selectedSt && !selectedSsoUser && !selectedProfileChange && (
      <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col md:h-full">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <InboxIcon className="w-5 h-5 text-brand-orange" />
              My Inbox
            </h2>
          </div>
          
          <nav className="flex-1 p-2 space-y-1">
            <button 
              onClick={() => setActiveTab('Pending')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'Pending' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Action Required
              </span>
              {pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'Pending' ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('Completed')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'Completed' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
            </button>
            <button 
              onClick={() => setActiveTab('Archived')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'Archived' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Archive className="w-4 h-4 mr-2" /> Archived
            </button>
          </nav>

        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{activeTab} Tasks</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <InboxIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>No {activeTab.toLowerCase()} tasks found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer group transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                          {task.category}
                        </span>
                        <p className={`text-sm font-bold truncate ${activeTab === 'Pending' ? 'text-slate-900' : 'text-slate-600'}`}>
                          {task.title}
                        </p>
                        {task.referenceType === 'PR' && task.prStatus && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.prStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            task.prStatus === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            task.prStatus === 'Draft' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {task.prStatus === 'Draft' ? 'Revision Required' : task.prStatus}
                          </span>
                        )}
                        {activeTab === 'Completed' && task.actionResult && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.actionResult === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            task.actionResult === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            task.actionResult === 'Review' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {task.actionResult === 'Review' ? 'Sent for Review' : task.actionResult}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{task.message}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeTab === 'Pending' && (
                          <button
                            onClick={(e) => updateTaskStatus(task.id, 'Archived', e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'Completed' && (
                          <button
                            onClick={(e) => updateTaskStatus(task.id, 'Archived', e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'Archived' && (
                          <button
                            onClick={(e) => updateTaskStatus(task.id, 'Pending', e)}
                            className="text-xs font-bold text-brand-orange hover:underline"
                          >
                            Unarchive
                          </button>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* PR Details View */}
      {selectedPr && selectedTask && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <button 
              onClick={() => { setSelectedPr(null);
                setSelectedStockOut(null);
                setSelectedCs(null);
                setSelectedSt(null);
                setSelectedSsoUser(null);
                setSelectedProfileChange(null);
                setSelectedTask(null); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Inbox Requisition Review: {selectedPr.prNumber}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Task: {selectedTask.title}</p>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requestor</span>
                  <span className="font-semibold text-slate-800">{selectedPr.requestor}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</span>
                  <span className="font-semibold text-slate-800">{selectedPr.department}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    selectedPr.priority === 'Emergency' ? 'bg-red-100 text-red-700' :
                    selectedPr.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{selectedPr.priority}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Justification</span>
                  <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-100 leading-relaxed mt-1">
                    {selectedPr.justification || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Requisition Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left bg-white text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">Item Name</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPr.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-600">{item.category}</td>
                          <td className="p-3 font-medium text-slate-800">
                            {item.itemName}
                            <div className="flex gap-1 mt-1">
                              {item.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                              {item.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold">{item.quantity}</td>
                          <td className="p-3 text-slate-500">{item.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Workflow Status / Steps</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedPr.approvals?.map((appr: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs bg-slate-50/30 hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">Step {appr.stepOrder}: {appr.roleRequired}</div>
                        {appr.comments && (
                          <div className="text-xs text-slate-500 mt-1">Comment: "{appr.comments}"</div>
                        )}
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          appr.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          appr.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{appr.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              {selectedTask.status === 'Pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActionModal('Review')}
                    className="px-4 py-2 border border-amber-300 text-amber-700 font-bold text-sm rounded bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    Send back for Review
                  </button>
                  <button 
                    onClick={() => setActionModal('Rejected')}
                    className="px-4 py-2 border border-red-300 text-red-700 font-bold text-sm rounded bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => setActionModal('Approved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Stock Out Workflow Action Modal */}
      {selectedStockOut && selectedTask && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <button 
              onClick={() => { setSelectedStockOut(null); setSelectedTask(null); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Inbox Stock Out Review: {selectedStockOut.requestNumber}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Task: {selectedTask.title}</p>
            </div>
          </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item Name</span>
                  <span className="font-semibold text-slate-800">
                    {selectedStockOut.itemName}
                    <div className="inline-flex gap-1 ml-2 align-middle">
                      {selectedStockOut.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                      {selectedStockOut.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                    </div>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity Requested</span>
                  <span className="font-semibold text-slate-800">{selectedStockOut.quantity}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason</span>
                  <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-100 leading-relaxed mt-1">
                    {selectedStockOut.reason || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              {selectedTask.status === 'Pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActionModal('Rejected')}
                    className="px-4 py-2 border border-red-300 text-red-700 font-bold text-sm rounded bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => setActionModal('Approved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
      )}

      {/* CS Details View */}
      {selectedCs && selectedTask && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <button 
              onClick={() => { setSelectedCs(null); setSelectedTask(null); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                CS Review: {selectedCs.csNumber}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Task: {selectedTask.title}</p>
            </div>
          </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">RFQ Ref</p>
                  <span className="font-semibold text-slate-800">{selectedCs.rfqNumber}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PR Ref</p>
                  <span className="font-semibold text-slate-800">{selectedCs.prNumber}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Selected Vendor</p>
                  <span className="font-semibold text-brand-orange">{selectedCs.selectedVendorName}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                  <span className="font-semibold text-emerald-600">{currencySymbol}{Number(selectedCs.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Evaluated Vendors & Scoring Breakdown</p>
                {selectedCs.evaluations && selectedCs.evaluations.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-100/70 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 border-r border-slate-200">Criteria</th>
                          <th className="px-3 py-2 border-r border-slate-200 text-center">Score (1-10)</th>
                          <th className="px-3 py-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCs.evaluations.map((ev: any) => (
                          <tr key={ev.id}>
                            <td className="px-3 py-2 font-semibold border-r border-slate-200">{ev.criteriaName} ({ev.weight}%)</td>
                            <td className="px-3 py-2 text-center font-bold text-brand-blue border-r border-slate-200">{ev.score}</td>
                            <td className="px-3 py-2 italic text-slate-500">{ev.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCs.vendors?.map((v: any) => (
                      <div key={v.id} className={`flex justify-between items-center p-3 rounded-lg border ${v.id === selectedCs.selectedVendorId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                        <span className="font-bold text-slate-700">{v.name}</span>
                        {v.id === selectedCs.selectedVendorId && (
                          <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded uppercase font-bold shadow-sm">Selected</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              {selectedTask.status === 'Pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActionModal('Rejected')}
                    className="px-4 py-2 border border-red-300 text-red-700 font-bold text-sm rounded bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => setActionModal('Approved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
      )}

      {selectedSt && selectedTask && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <button 
              onClick={() => { setSelectedSt(null); setSelectedTask(null); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Stock Transfer Details</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Transfer No:</span> <span className="font-medium text-gray-900">{selectedSt.transferNumber}</span></div>
              <div><span className="text-gray-500">Source:</span> <span className="font-medium text-gray-900">{selectedSt.sourceWarehouseName}</span></div>
              <div><span className="text-gray-500">Destination:</span> <span className="font-medium text-gray-900">{selectedSt.destinationWarehouseName}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium text-gray-900">{selectedSt.status}</span></div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
            <button onClick={() => setActionModal('Rejected')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reject</button>
            <button onClick={() => setActionModal('Approved')} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Approve Transfer</button>
          </div>
        </div>
      )}

      {/* SSO User Approval View */}
      {selectedSsoUser && selectedTask && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <button 
              onClick={() => { setSelectedSsoUser(null); setSelectedTask(null); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Pending User Approval: {selectedSsoUser.name}</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedSsoUser.name}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{selectedSsoUser.email}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{selectedSsoUser.phone || 'N/A'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium text-amber-600">{selectedSsoUser.status}</span></div>
            </div>

            {selectedTask.status === 'Pending' && (
              <div className="mt-8 space-y-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Assign Role & Location</h3>
                
                {!selectedTask.isFinalStep && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md text-sm">
                    <strong>Note:</strong> This is not the final approval step. You can optionally suggest a role and branch, or leave them blank. The final approver will confirm these details.
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department {selectedTask.isFinalStep && <span className="text-red-500">*</span>}</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      required={selectedTask.isFinalStep}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none focus:ring-1 focus:ring-brand-orange bg-white"
                    >
                      <option value="">Select a Department</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Designation {selectedTask.isFinalStep && <span className="text-red-500">*</span>}</label>
                    <select
                      value={selectedDesignation}
                      onChange={(e) => setSelectedDesignation(e.target.value)}
                      required={selectedTask.isFinalStep}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none focus:ring-1 focus:ring-brand-orange bg-white"
                    >
                      <option value="">Select a Designation</option>
                      {designations.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role {selectedTask.isFinalStep && <span className="text-red-500">*</span>}</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      required={selectedTask.isFinalStep}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none focus:ring-1 focus:ring-brand-orange bg-white"
                    >
                      <option value="">Select a Role</option>
                      {roles.map((r: any) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Office / Branch {selectedTask.isFinalStep && <span className="text-red-500">*</span>}</label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      required={selectedTask.isFinalStep}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none focus:ring-1 focus:ring-brand-orange bg-white"
                    >
                      <option value="">Select an Office</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {selectedTask.status === 'Pending' && (
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setActionModal('Rejected')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Reject User</button>
              <button 
                onClick={() => setActionModal('Approved')} 
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={selectedTask.isFinalStep && (!selectedRole || !selectedBranch || !selectedDepartment || !selectedDesignation)}
              >
                Approve User
              </button>
            </div>
          )}
        </div>
      )}

      {/* Decision Submission Modal */}
      {(actionModal && (selectedPr || selectedStockOut || selectedCs || selectedSt || selectedSsoUser)) && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className={`p-4 border-b font-bold text-md ${
              actionModal === 'Approved' ? 'bg-green-50 text-green-800 border-green-100' :
              actionModal === 'Rejected' ? 'bg-red-50 text-red-800 border-red-100' :
              'bg-amber-50 text-amber-800 border-amber-100'
            }`}>
              Confirm Action: {actionModal === 'Review' ? 'Send back for Review' : actionModal}
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Comments (Optional)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:border-brand-orange outline-none focus:ring-1 focus:ring-brand-orange"
                  rows={3}
                  placeholder="e.g. Please clarify estimated cost"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => { setActionModal(null); setComments(''); }}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      setActionLoading(true);
                      const token = await getToken();
                      await fetchWithAuth(
                        selectedPr ? `/api/pr/approvals/${selectedPr.id}` : 
                        selectedCs ? `/api/cs/approvals/${selectedCs.id}` : 
                        selectedSt ? `/api/stock-transfers/${selectedSt.id}/submit-approval` : 
                        selectedSsoUser ? `/api/auth/sso/approve-user` :
                        `/api/inventory/stock-out/approvals/${selectedStockOut.id}`,
                        token, 
                        {
                          method: 'POST',
                          body: JSON.stringify({ 
                            status: actionModal, 
                            comments,
                            // SSO specific fields
                            ...(selectedSsoUser ? {
                              userId: selectedSsoUser.id,
                              action: actionModal,
                              role: selectedRole,
                              branchId: selectedBranch,
                              department: selectedDepartment,
                              designation: selectedDesignation,
                              companyId: selectedSsoUser.companyId
                            } : {})
                          })
                        }
                      );
                      setActionModal(null);
                      setComments('');
                      setSelectedPr(null);
                setSelectedStockOut(null);
                setSelectedCs(null);
                setSelectedSt(null);
                setSelectedSsoUser(null);
                setSelectedProfileChange(null);
                setSelectedTask(null);
                      loadData();
                    } catch (err: any) {
                      alert("Action failed: " + err.message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white font-bold text-sm rounded shadow-sm transition-colors ${
                    actionModal === 'Approved' ? 'bg-green-600 hover:bg-green-700' :
                    actionModal === 'Rejected' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Data Change Request Modal */}
      {selectedProfileChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800">Profile Data Change Request</h2>
              <button onClick={() => { setSelectedProfileChange(null); setProfileChangeEdit({}); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Requested Changes from {selectedProfileChange.user?.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(selectedProfileChange.request?.requestedData || {}).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-slate-500 capitalize block text-xs">{key}</span>
                      <span className="font-medium text-slate-800">{String(val) || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">Edit Final Profile Details</h3>
                <p className="text-xs text-slate-500 mb-4">You can modify the requested fields before final approval.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Role</label>
                    <SearchableSelect
                      options={roles.map(r => ({ label: r.name, value: r.name }))}
                      value={profileChangeEdit.role || ''}
                      onChange={(val) => setProfileChangeEdit({ ...profileChangeEdit, role: val })}
                      placeholder="Select Role"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Designation</label>
                    <SearchableSelect
                      options={designations.map(d => ({ label: d.name, value: d.name }))}
                      value={profileChangeEdit.designation || ''}
                      onChange={(val) => setProfileChangeEdit({ ...profileChangeEdit, designation: val })}
                      placeholder="Select Designation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Department</label>
                    <SearchableSelect
                      options={departments.map(d => ({ label: d.name, value: d.name }))}
                      value={profileChangeEdit.department || ''}
                      onChange={(val) => setProfileChangeEdit({ ...profileChangeEdit, department: val })}
                      placeholder="Select Department"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Branch/Office</label>
                    <SearchableSelect
                      options={branches.map(b => ({ label: b.name, value: b.id.toString() }))}
                      value={profileChangeEdit.branchId?.toString() || ''}
                      onChange={(val) => setProfileChangeEdit({ ...profileChangeEdit, branchId: parseInt(val) })}
                      placeholder="Select Branch"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Supervisor UID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-brand-orange"
                      value={profileChangeEdit.supervisorUid || ''}
                      onChange={(e) => setProfileChangeEdit({ ...profileChangeEdit, supervisorUid: e.target.value })}
                      placeholder="Supervisor UID (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-brand-orange"
                      value={profileChangeEdit.phone || ''}
                      onChange={(e) => setProfileChangeEdit({ ...profileChangeEdit, phone: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button 
                onClick={() => {
                  setSelectedProfileChange(null);
                  setProfileChangeEdit({});
                }}
                disabled={actionLoading}
                className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    const token = await getToken();
                    await fetchWithAuth(
                      `/api/profile/change-request/${selectedProfileChange.request.id}/approve`,
                      token, 
                      {
                        method: 'POST',
                        body: JSON.stringify({ 
                          action: 'Rejected', 
                          comments: '',
                          modifiedData: profileChangeEdit
                        })
                      }
                    );
                    setSelectedProfileChange(null);
                    setProfileChangeEdit({});
                    await loadData();
                  } catch (e) {
                    console.error("Failed to reject", e);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="px-4 py-2 font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded text-sm disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    const token = await getToken();
                    await fetchWithAuth(
                      `/api/profile/change-request/${selectedProfileChange.request.id}/approve`,
                      token, 
                      {
                        method: 'POST',
                        body: JSON.stringify({ 
                          action: 'Approved', 
                          comments: '',
                          modifiedData: profileChangeEdit
                        })
                      }
                    );
                    setSelectedProfileChange(null);
                    setProfileChangeEdit({});
                    await loadData();
                  } catch (e) {
                    console.error("Failed to approve", e);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="px-4 py-2 font-bold text-white bg-green-600 hover:bg-green-700 rounded shadow-sm text-sm disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Approve Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
