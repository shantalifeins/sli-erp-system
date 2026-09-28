const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The block to remove
const regex1 = /[ \t]*if[ \t]*\(!companyId\)[ \t]*\{[ \t]*\n[ \t]*const fallbackCompany = await db\.select\(\)\.from\(companies\)\.limit\(1\);[ \t]*\n[ \t]*if[ \t]*\(fallbackCompany\.length > 0\)[ \t]*companyId = fallbackCompany\[0\]\.id;[ \t]*\n[ \t]*\}[ \t]*\n/g;

const regex2 = /[ \t]*if[ \t]*\(!companyId\)[ \t]*\{[ \t]*\n[ \t]*const fallbackCompany = await db\.select\(\)\.from\(companies\)\.limit\(1\);[ \t]*\n[ \t]*if[ \t]*\(fallbackCompany\.length > 0\)[ \t]*\{[ \t]*\n[ \t]*companyId = fallbackCompany\[0\]\.id;[ \t]*\n[ \t]*\}[ \t]*\n[ \t]*\}[ \t]*\n/g;

let originalLength = code.length;
code = code.replace(regex1, '');
code = code.replace(regex2, '');

console.log(`Replaced. Length from ${originalLength} to ${code.length}`);
fs.writeFileSync('server.ts', code, 'utf8');
