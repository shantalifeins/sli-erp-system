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

async function debugLogs() {
  try {
    conn.on('ready', async () => {
      try {
        console.log('\n--- Checking Docker Logs for sli_erp_app ---');
        await runCommand('docker logs --tail 30 sli_erp_app');

        console.log('\n--- Checking Existing Let\'s Encrypt Certs ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S ls -la /etc/letsencrypt/live/`);
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

debugLogs();
