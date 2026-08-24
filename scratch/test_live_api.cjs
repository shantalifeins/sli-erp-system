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

async function testLiveApi() {
  try {
    conn.on('ready', async () => {
      try {
        console.log('\n--- Checking SLI ERP Docker Container Status ---');
        await runCommand('docker ps --filter name=sli_erp_app');

        console.log('\n--- Testing /api/health Endpoint ---');
        await runCommand('curl -i http://localhost:5000/api/health');

        console.log('\n--- Testing Native Login Endpoint /api/auth/login ---');
        await runCommand('curl -i -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"test@shantalife.com","password":"invalidpassword"}\'');

        console.log('\n--- Checking Port 5000 Local Listen Status ---');
        await runCommand('curl -i http://127.0.0.1:5000/');
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

testLiveApi();
