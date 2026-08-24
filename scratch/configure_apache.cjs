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
        console.log(`[EXIT CODE]: ${code}`);
        if (code === 0 || code === null) {
          resolve(stdout.trim());
        } else {
          console.error(`[STDERR]: ${stderr}`);
          resolve(stdout.trim() || stderr.trim());
        }
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

async function configureApache() {
  try {
    console.log('Connecting to SSH server 10.16.49.78 for Apache configuration...');
    conn.on('ready', async () => {
      console.log('✅ SSH Connection established!');

      try {
        const domain = 'erp.shantalife.com';
        console.log(`\n--- Step 1: Writing Apache VirtualHost for ${domain} ---`);
        
        const apacheConf = `<VirtualHost *:443>
    ServerName ${domain}
    ServerAdmin info@shantalife.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Ssl on

    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/

    ErrorLog \${APACHE_LOG_DIR}/sli_erp_error.log
    CustomLog \${APACHE_LOG_DIR}/sli_erp_access.log combined

    Include /etc/letsencrypt/options-ssl-apache.conf
    SSLCertificateFile /etc/letsencrypt/live/${domain}/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${domain}/privkey.pem
</VirtualHost>

<VirtualHost *:80>
    ServerName ${domain}
    Redirect permanent / https://${domain}/
</VirtualHost>`;

        // Echo with sudo to write /etc/apache2/sites-available/sli_erp.conf
        const writeCmd = `echo '${sshConfig.password}' | sudo -S bash -c "cat << 'EOF' > /etc/apache2/sites-available/sli_erp.conf\n${apacheConf}\nEOF"`;
        await runCommand(writeCmd);

        console.log('\n--- Step 2: Enabling sli_erp.conf site in Apache ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S a2ensite sli_erp.conf`);

        console.log('\n--- Step 3: Testing Apache Configuration Syntax ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S apache2ctl configtest`);

        console.log('\n--- Step 4: Reloading Apache2 (Safe Reload, Zero Service Interruption) ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S systemctl reload apache2`);

        console.log('\n--- Step 5: Checking Active Port 5000 and Docker Container Status ---');
        await runCommand('docker ps --filter name=sli_erp_app');
        await runCommand('curl -I http://localhost:5000/api/health');

        console.log('\n========================================');
        console.log(`🎉 Apache Proxy Setup Completed for https://${domain}!`);
        console.log('========================================');
      } catch (err) {
        console.error('Error during Apache configuration:', err);
      } finally {
        conn.end();
      }
    }).connect(sshConfig);
  } catch (e) {
    console.error('Connection failure:', e);
  }
}

configureApache();
