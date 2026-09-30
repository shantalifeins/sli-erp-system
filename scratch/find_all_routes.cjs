const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('/api/inventory') || line.includes('/api/warehouses') || line.includes('/api/assets')) {
    if (line.includes('app.get') || line.includes('app.post') || line.includes('app.use')) {
      console.log(`${i + 1}: ${line.trim()}`);
    }
  }
});
