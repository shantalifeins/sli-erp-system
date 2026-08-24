import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const res = await pool.query(`SELECT uid, email FROM users WHERE email LIKE '%@shantalife.com'`);
  console.log(`Found ${res.rows.length} users in PostgreSQL users table with @shantalife.com`);
  
  // Find which ones are missing in GoTrue or what their emails are
  const emailsWithout1 = res.rows.map(r => r.email).filter(e => !e.includes('1@'));
  console.log(`Emails WITHOUT '1':`, emailsWithout1.length);
  console.log(emailsWithout1.slice(0, 10));
}

check();
