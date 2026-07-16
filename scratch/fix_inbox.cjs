const fs = require('fs');
let code = fs.readFileSync('scratch/Inbox.tsx', 'utf8');

// 1. Add users state
if(!code.includes('const [users, setUsers]')) {
  code = code.replace('const [designations, setDesignations] = useState<any[]>([]);', 'const [designations, setDesignations] = useState<any[]>([]);\n  const [users, setUsers] = useState<any[]>([]);');
}

// 2. Fetch users in Profile Data Change Request
code = code.replace(
  "fetchWithAuth('/api/designations', token)", 
  "fetchWithAuth('/api/designations', token),\n            fetchWithAuth('/api/users?status=Active', token)"
);
code = code.replace(
  "const [rolesData, branchesData, departmentsData, designationsData] = await Promise.all([",
  "const [rolesData, branchesData, departmentsData, designationsData, usersData] = await Promise.all(["
);
code = code.replace(
  "setDesignations(designationsData || []);",
  "setDesignations(designationsData || []);\n          setUsers(usersData || []);"
);

// 3. Update Supervisor dropdown to use users map
code = code.replace(
  "{roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}",
  "{users.map((u: any) => <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>)}"
);

fs.writeFileSync('src/modules/home/pages/Inbox.tsx', code);
