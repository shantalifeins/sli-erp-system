import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
  connectionString: 'postgresql://postgres.lyoozoeryooisqywbfyg:_m%40qU2757EsbdVD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then((res) => {
    console.log('Time:', res.rows[0]);
    return client.end();
  })
  .catch((err) => {
    console.error('Connection error:', err);
    process.exit(1);
  });
