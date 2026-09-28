// Migration via Supabase REST API using service role key
// Run: node scripts/create-asset-locations-api.cjs
const https = require('https');

const SUPABASE_URL = 'https://lyoozoeryooisqywbfyg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b296b2VyeW9vaXNxeXdiZnlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjc4MTgzMSwiZXhwIjoyMDk4MzU3ODMxfQ.rmvLC73pIKv0SLf9qZnjQcU8qG2czzAZ9mCkATv2vxs';

const sql = `
CREATE TABLE IF NOT EXISTS asset_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES asset_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

const body = JSON.stringify({ query: sql });
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

// Use Supabase's pg REST directly via the SQL endpoint
const options = {
  hostname: 'lyoozoeryooisqywbfyg.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(body);
req.end();
