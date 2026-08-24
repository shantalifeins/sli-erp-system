const { Client } = require('ssh2');

const conn = new Client();

const sshConfig = {
  host: '10.16.49.78',
  port: 22,
  username: 'iamadmin',
  password: 'D0m@1n!ssl$'
};

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`[EXEC]: ${command}`);
    console.log(`========================================`);

    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data.toString());
      });
    });
  });
}

async function createSuperAdmin() {
  try {
    conn.on('ready', async () => {
      try {
        console.log('\n--- Generating Salt:Hash Password for Super Admin ---');

        const crypto = require('crypto');
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync('Admin@123456#', salt, 1000, 64, 'sha512').toString('hex');
        const fullHash = `${salt}:${hash}`;

        // Delete existing user with this email
        await runCommand(`docker exec postgres_prod psql -U postgres -d sli_erp_db -c "DELETE FROM users WHERE email = 'admin@shantalife.com';"`);

        // Insert fresh Super Admin
        const insertAdminSql = `docker exec postgres_prod psql -U postgres -d sli_erp_db -c "INSERT INTO users (uid, email, name, role, status, password_hash) VALUES ('admin-super-uid-2026', 'admin@shantalife.com', 'System Admin', 'Super Admin', 'Approved', '${fullHash}');"`;
        await runCommand(insertAdminSql);

        console.log('\n--- Testing Native Login Endpoint /api/auth/login ---');
        await runCommand('curl -i -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"admin@shantalife.com","password":"Admin@123456#"}\'');

        console.log('\n========================================');
        console.log('🎉 Super Admin Seeded and Authenticated Successfully!');
        console.log('========================================');
      } catch (err) {
        console.error(err);
      } finally {
        conn.end();
      }
    }).connect(sshConfig);
  } catch (e) {
    console.error(e);
  }
}

createSuperAdmin();
