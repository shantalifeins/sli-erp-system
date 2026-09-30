const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('app.get(') && line.includes('/api/')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
