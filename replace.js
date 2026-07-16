const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace standard pattern
const pattern1 = /let companyId = req\.query\.companyId as string \|\| req\.user\?\.company_id;/g;
content = content.replace(pattern1, 'const companyId = await resolveTenantId(req);');

// Replace the fallback logic if it exists immediately after
const pattern2 = /if \(\!companyId\) \{\s+const fallbackCompany = await db\.select\(\)\.from\(companies\)\.limit\(1\);\s+if \(fallbackCompany\.length > 0\) \{\s+companyId = fallbackCompany\[0\]\.id;\s+\} else \{\s+return res\.json\(\{ plugins: \[\] \}\);\s+\}\s+\}/g;
content = content.replace(pattern2, '');

const pattern3 = /if \(\!companyId\) \{\s+const fallbackCompany = await db\.select\(\)\.from\(companies\)\.limit\(1\);\s+if \(fallbackCompany\.length > 0\) companyId = fallbackCompany\[0\]\.id;\s+\}/g;
content = content.replace(pattern3, '');

// Also replace the single string ones if they exist
const pattern4 = /let companyId = req\.query\.companyId as string;/g;
content = content.replace(pattern4, 'const companyId = await resolveTenantId(req);');

fs.writeFileSync('server.ts', content);
console.log('Replaced companyId resolutions in server.ts');
