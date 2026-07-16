const fs = require('fs');
let code = fs.readFileSync('scratch/Inbox.tsx', 'utf8');

// 1. Add states
const states = `
  const [selectedProfileChange, setSelectedProfileChange] = useState<any | null>(null);
  const [profileChangeEdit, setProfileChangeEdit] = useState<any>({});
`;
code = code.replace('const [actionLoading, setActionLoading] = useState(false);', 'const [actionLoading, setActionLoading] = useState(false);\n' + states);

// 2. Add handleTaskClick logic
const taskLogic = `
    } else if (task.referenceType === 'Profile Data Change Request') {
      try {
        const token = await getToken();
        const res = await fetchWithAuth(\`/api/profile/change-request/\${task.referenceId}\`, token);
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
`;
code = code.replace(/\} else \{\s*if \(task\.actionLink\) \{/, taskLogic.trim() + ' {');

// 3. Clear states on close
const closeLogic = `
                setSelectedPr(null);
                setSelectedStockOut(null);
                setSelectedCs(null);
                setSelectedSt(null);
                setSelectedSsoUser(null);
                setSelectedProfileChange(null);
                setSelectedTask(null);
`;
code = code.replace(/setSelectedPr\(null\);[\s\S]*?setSelectedTask\(null\);/g, closeLogic.trim());

// 4. Update hiding conditions
code = code.replace('!selectedPr && !selectedStockOut && !selectedCs && !selectedSt && !selectedSsoUser &&', '!selectedPr && !selectedStockOut && !selectedCs && !selectedSt && !selectedSsoUser && !selectedProfileChange &&');

// 5. Add handleActionSubmit logic
const submitLogic = `
      } else if (selectedTask.referenceType === 'Profile Data Change Request') {
        await fetchWithAuth(\`/api/profile/change-request/\${selectedTask.referenceId}/approve\`, token, {
          method: 'POST',
          body: JSON.stringify({ action: actionModal, comments, modifiedData: profileChangeEdit })
        });
      }
`;
code = code.replace(/(\} else if \(selectedTask\.referenceType === 'User Registration'\) \{[\s\S]*?body: JSON\.stringify\(\{ action: actionModal, comments, finalData, isFinalStep \} \)\s*\}\);\s*\})/, '$1' + submitLogic);

// 6. Add Profile Change Approval View UI at the end of the return statement
const profileChangeUI = `
      {/* Profile Data Change Request Detail View */}
      {selectedProfileChange && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-4 p-4 border-b border-slate-200">
            <button 
              onClick={() => {
                setSelectedProfileChange(null);
                setSelectedTask(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-slate-800 text-lg">Profile Update Approval: {selectedProfileChange.user.name}</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Requested Profile Changes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
                    <input type="text" value={profileChangeEdit.phone || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Role</label>
                    <input type="text" value={profileChangeEdit.role || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                    <select value={profileChangeEdit.department || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, department: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange">
                      <option value="">Select Department</option>
                      {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Designation</label>
                    <select value={profileChangeEdit.designation || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange">
                      <option value="">Select Designation</option>
                      {designations.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Branch</label>
                    <select value={profileChangeEdit.branchId || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, branchId: e.target.value ? parseInt(e.target.value) : null})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange">
                      <option value="">Select Branch</option>
                      {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Supervisor</label>
                    <select value={profileChangeEdit.supervisorUid || ''} onChange={e => setProfileChangeEdit({...profileChangeEdit, supervisorUid: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-brand-orange">
                      <option value="">Select Supervisor</option>
                      {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
            <button onClick={() => setActionModal('Rejected')} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-xl text-sm transition-colors">
              Reject Request
            </button>
            <button onClick={() => setActionModal('Approved')} className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl text-sm transition-colors">
              Approve Updates
            </button>
          </div>
        </div>
      )}
`;
code = code.replace(/\{\/\* SSO User Registration Detail View \*\/\}/, profileChangeUI + '\n      {/* SSO User Registration Detail View */}');

fs.writeFileSync('scratch/Inbox.tsx', code);
