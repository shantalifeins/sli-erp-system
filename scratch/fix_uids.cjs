const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixUids() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find all users from the original company (Shanta Life: 19b23b55-bc5b-440f-9de0-7d64051b2a86)
    // Wait, since I don't know the exact ID of the original, I can group by email and pick the most common uid or the one that starts with a certain prefix. 
    // Actually, I can just pick the MIN(id) for each email, assuming the original users were inserted first.
    
    const res = await client.query(`
      WITH first_users AS (
        SELECT email, MIN(id) as first_id
        FROM users
        GROUP BY email
      )
      SELECT u.email, u.uid, u.id
      FROM users u
      JOIN first_users f ON u.id = f.first_id
    `);

    let updateCount = 0;
    
    for (const row of res.rows) {
      const email = row.email;
      const correctUid = row.uid;
      
      const updateRes = await client.query(`
        UPDATE users 
        SET uid = $1 
        WHERE email = $2 AND uid != $1
      `, [correctUid, email]);
      
      if (updateRes.rowCount > 0) {
        console.log(`Updated ${updateRes.rowCount} users with email ${email} to use uid ${correctUid}`);
        updateCount += updateRes.rowCount;
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully synced ${updateCount} duplicate users to the correct GoTrue UID.`);
    
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error fixing UIDs:', e);
  } finally {
    client.release();
    pool.end();
  }
}

fixUids();
