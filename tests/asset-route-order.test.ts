import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Asset Router Registration Order (Phase 0)', () => {
  it('should not have static routes defined after parameterized routes', () => {
    const routesFile = path.join(__dirname, '../src/modules/assets/api/routes.ts');
    const code = fs.readFileSync(routesFile, 'utf8');
    
    const lines = code.split('\n');
    let hasParamIdRoute = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/router\.get\(['"]\/:id['"]/)) {
        hasParamIdRoute = true;
      }
      
      if (hasParamIdRoute && line.match(/router\.get\(['"]\/[a-zA-Z0-9_-]+['"]/)) {
        // e.g., router.get('/transfers' defined after router.get('/:id')
        // In our fixed file, router.get('/:id') should be near the end.
        throw new Error(`Static route found after parameterized route at line ${i+1}: ${line.trim()}`);
      }
    }
    
    expect(hasParamIdRoute).toBe(true);
  });
});
