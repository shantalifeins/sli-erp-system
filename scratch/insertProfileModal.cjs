const fs = require('fs');

const path = 'src/modules/home/pages/Inbox.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('SearchableSelect')) {
  code = code.replace(
    "import { Inbox as InboxIcon, CheckCircle, Clock, Search, ChevronRight, Check, X, FileText, FileSpreadsheet, Eye, MessageSquare, AlertCircle, RefreshCw, Send, ArrowLeft, Plus } from 'lucide-react';",
    "import { Inbox as InboxIcon, CheckCircle, Clock, Search, ChevronRight, Check, X, FileText, FileSpreadsheet, Eye, MessageSquare, AlertCircle, RefreshCw, Send, ArrowLeft, Plus } from 'lucide-react';\nimport SearchableSelect from '@/src/shared/components/SearchableSelect';"
  );
}

const modalCode = `
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
                      \`/api/profile/change-request/\${selectedProfileChange.request.id}/approve\`,
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
                      \`/api/profile/change-request/\${selectedProfileChange.request.id}/approve\`,
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
`;

if (!code.includes('Profile Data Change Request Modal')) {
  code = code.replace('    </PageLayout>', modalCode + '\n    </PageLayout>');
  fs.writeFileSync(path, code, 'utf8');
  console.log("Added Profile Change Modal.");
} else {
  console.log("Already added.");
}
