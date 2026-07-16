const fs = require('fs');
let code = fs.readFileSync('src/modules/userPanel/pages/Profile.tsx', 'utf8');

const modalHtml = `
      {/* ── Edit Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Request Profile Update</h3>
                <p className="text-sm text-slate-500">Submit a request to HR to update your information.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="profileEditForm" onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Requested Role</label>
                    <input type="text" value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50" placeholder="e.g. SLI Employee" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                    <select value={editDepartment} onChange={e => setEditDepartment(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50">
                      <option value="">Select Department</option>
                      {masterData.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Designation</label>
                    <select value={editDesignation} onChange={e => setEditDesignation(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50">
                      <option value="">Select Designation</option>
                      {masterData.designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Office (Branch)</label>
                    <select value={editBranchId} onChange={e => setEditBranchId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50">
                      <option value="">Select Branch</option>
                      {masterData.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Supervisor</label>
                    <select value={editSupervisorUid} onChange={e => setEditSupervisorUid(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50">
                      <option value="">Select Supervisor</option>
                      {masterData.users.map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>)}
                    </select>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
              <button form="profileEditForm" type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#F37021] hover:bg-[#e05e10] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('{isEditModalOpen && (')) {
  let target = '    </div>\r\n  );\r\n}';
  if (!code.includes(target)) {
    target = '    </div>\n  );\n}';
  }
  
  if (code.includes(target)) {
    code = code.replace(target, modalHtml + '\n' + target);
    fs.writeFileSync('src/modules/userPanel/pages/Profile.tsx', code);
  }
}
