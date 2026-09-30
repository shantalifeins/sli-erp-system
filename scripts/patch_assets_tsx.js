import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/assets/pages/Assets.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add Assignment Panel & Trace Panel components at the top (after imports)
const panelsStr = `

function ProcurementTracePanel({ asset, token }: { asset: any, token: string }) {
  const [traceData, setTraceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!asset?.poItemId && !asset?.sourceGrnId) return;
    setLoading(true);
    let url = \`/api/reports/traceability?\`;
    if (asset.poId) url += \`poId=\${asset.poId}\`;
    
    fetch(url, { headers: { Authorization: \`Bearer \${token}\` } })
      .then(r => r.json())
      .then(data => {
        // Find the specific item line
        if (Array.isArray(data)) {
           setTraceData(data.filter(d => d.assetId === asset.id || d.poId === asset.poId));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [asset, token]);

  if (loading) return <div className="text-sm text-slate-500 p-4">Loading trace data...</div>;
  if (!traceData.length) return <div className="text-sm text-slate-500 p-4">No procurement trace available for this asset.</div>;

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-slate-400" />
        Procurement Lifecycle Trace
      </h4>
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {traceData.map((trace, i) => (
           <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
             <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <FileText className="w-4 h-4" />
             </div>
             <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                   <div className="font-bold text-slate-900 text-xs uppercase text-purple-600">Trace #{i+1}</div>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                   {trace.prId && <div><span className="font-medium">PR ID:</span> {trace.prId}</div>}
                   {trace.poId && <div><span className="font-medium">PO ID:</span> {trace.poId}</div>}
                   {trace.grnId && <div><span className="font-medium">GRN ID:</span> {trace.grnId}</div>}
                   {trace.invoiceId && <div><span className="font-medium">Invoice ID:</span> {trace.invoiceId}</div>}
                   {trace.assetCode && <div><span className="font-medium">Asset Code:</span> {trace.assetCode}</div>}
                </div>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentHistoryPanel({ assetId, token, users, departments, branches }: any) {
   const [assignments, setAssignments] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [isAssigning, setIsAssigning] = useState(false);
   const [formData, setFormData] = useState({ assignedToUid: '', departmentId: '', branchId: '', notes: '' });

   const loadData = async () => {
      setLoading(true);
      fetch(\`/api/assets/\${assetId}/assignments\`, { headers: { Authorization: \`Bearer \${token}\` } })
        .then(r => r.json())
        .then(setAssignments)
        .catch(console.error)
        .finally(() => setLoading(false));
   };

   useEffect(() => { loadData(); }, [assetId]);

   const handleAssign = async (e: any) => {
      e.preventDefault();
      try {
         const res = await fetch(\`/api/assets/\${assetId}/assign\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
            body: JSON.stringify(formData)
         });
         if (!res.ok) throw new Error(await res.text());
         setIsAssigning(false);
         loadData();
      } catch (err: any) {
         alert(err.message);
      }
   };

   const handleReturn = async (notes: string) => {
      try {
         const res = await fetch(\`/api/assets/\${assetId}/return\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
            body: JSON.stringify({ notes })
         });
         if (!res.ok) throw new Error(await res.text());
         loadData();
      } catch (err: any) {
         alert(err.message);
      }
   };

   return (
      <div className="mt-4">
         <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
               <Users className="w-4 h-4 text-slate-400" /> Assignment History
            </h4>
            <button onClick={() => setIsAssigning(!isAssigning)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200">
               {isAssigning ? 'Cancel' : 'New Assignment'}
            </button>
         </div>

         {isAssigning && (
            <form onSubmit={handleAssign} className="bg-slate-50 p-3 rounded border border-slate-200 mb-4 grid grid-cols-2 gap-3">
               <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assign To User</label>
                  <select value={formData.assignedToUid} onChange={e => setFormData({...formData, assignedToUid: e.target.value})} className="w-full text-sm border-slate-300 rounded-md">
                     <option value="">-- None --</option>
                     {users.map((u: any) => <option key={u.uid} value={u.uid}>{u.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full text-sm border-slate-300 rounded-md">
                     <option value="">-- None --</option>
                     {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
               </div>
               <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                  <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full text-sm border-slate-300 rounded-md" placeholder="Reason for assignment..." />
               </div>
               <div className="col-span-2 flex justify-end">
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Assign Asset</button>
               </div>
            </form>
         )}

         <div className="space-y-2">
            {assignments.map(a => (
               <div key={a.id} className="p-3 bg-white border border-slate-200 rounded text-sm flex justify-between items-center">
                  <div>
                     <div className="font-medium text-slate-800">{a.assignedToName || a.departmentName || 'Unknown'}</div>
                     <div className="text-xs text-slate-500">
                        Assigned: {new Date(a.assignedAt).toLocaleDateString()} 
                        {a.returnedAt ? \` → Returned: \${new Date(a.returnedAt).toLocaleDateString()}\` : ' (Currently Active)'}
                     </div>
                     {a.notes && <div className="text-xs text-slate-400 mt-1 italic">"{a.notes}"</div>}
                  </div>
                  {a.status === 'Active' && (
                     <button onClick={() => {
                        const notes = prompt('Return notes (optional):');
                        if (notes !== null) handleReturn(notes);
                     }} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded">
                        Return
                     </button>
                  )}
               </div>
            ))}
            {!loading && assignments.length === 0 && <div className="text-slate-500 text-sm py-2">No assignment history.</div>}
         </div>
      </div>
   );
}
`;

if (!content.includes('ProcurementTracePanel')) {
   content = content.replace("export default function Assets() {", panelsStr + "\nexport default function Assets() {");
}

const replacementRegex = /\{viewingAssetId && \([\s\S]*?<AttachmentPanel refType="Asset" refId=\{viewingAssetId\} \/>[\s\S]*?<\/div>\s*\)\}/g;
const matched = content.match(replacementRegex);

if (matched) {
   const newRender = `{viewingAssetId && (() => {
        const asset = assets.find(a => a.id === viewingAssetId);
        return (
        <div className="mt-4 p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                   <Paperclip className="w-4 h-4 text-slate-400" />
                   Asset Documents & Attachments
                </h4>
                <AttachmentPanel refType="Asset" refId={viewingAssetId} />
                
                {asset && <ProcurementTracePanel asset={asset} token={token} />}
             </div>
             <div>
                <AssignmentHistoryPanel 
                   assetId={viewingAssetId} 
                   token={token} 
                   users={users} 
                   departments={departments} 
                   branches={branches} 
                />
             </div>
          </div>
        </div>
      )})()}`;
   
   content = content.replace(replacementRegex, newRender);
} else {
   console.log('Could not find viewingAssetId render block');
}

// Add Activity icon import
if (!content.includes("Activity,")) {
    content = content.replace("Users,", "Users, Activity,");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched Assets.tsx');
