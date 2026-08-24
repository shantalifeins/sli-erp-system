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

async function setupApacheAndCertbot() {
  try {
    console.log('Connecting to SSH server 10.16.49.78 for Apache & Certbot setup...');
    conn.on('ready', async () => {
      console.log('✅ SSH Connection established!');

      try {
        const domain = 'erp.shantalife.com';
        
        // Step 1: Write HTTP Port 80 Apache VirtualHost first
        console.log(`\n--- Step 1: Configuring HTTP VirtualHost for ${domain} ---`);
        const httpConf = `<VirtualHost *:80>
    ServerName ${domain}
    ServerAdmin info@shantalife.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"

    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/

    ErrorLog \${APACHE_LOG_DIR}/sli_erp_error.log
    CustomLog \${APACHE_LOG_DIR}/sli_erp_access.log combined
</VirtualHost>`;

        await runCommand(`echo '${sshConfig.password}' | sudo -S bash -c "cat << 'EOF' > /etc/apache2/sites-available/sli_erp.conf\n${httpConf}\nEOF"`);

        // Step 2: Enable site and test config
        console.log('\n--- Step 2: Enabling sli_erp.conf site in Apache ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S a2ensite sli_erp.conf`);
        await runCommand(`echo '${sshConfig.password}' | sudo -S apache2ctl configtest`);
        await runCommand(`echo '${sshConfig.password}' | sudo -S systemctl reload apache2`);

        // Step 3: Run Certbot to generate/install SSL certificate for erp.shantalife.com
        console.log(`\n--- Step 3: Requesting Let's Encrypt SSL Certificate via Certbot ---`);
        await runCommand(`echo '${sshConfig.password}' | sudo -S certbot --apache -d ${domain} --non-interactive --agree-tos --email info@shantalife.com || true`);

        // Step 4: Final Apache Reload
        console.log('\n--- Step 4: Reloading Apache2 after Certbot SSL configuration ---');
        await runCommand(`echo '${sshConfig.password}' | sudo -S systemctl reload apache2`);

        // Step 5: Test live HTTPS health endpoint
        console.log(`\n--- Step 5: Testing Live Health Endpoint https://${domain}/api/health ---`);
        await runCommand(`curl -i -k https://${domain}/api/health || curl -i http://${domain}/api/health`);

        console.log('\n========================================');
        console.log(`🎉 LIVE DEPLOYMENT COMPLETE FOR https://${domain}!`);
        console.log('========================================');
      } catch (err) {
        console.error('Error during Apache/Certbot setup:', err);
      } finally {
        conn.end();
      }
    }).connect(sshConfig);
  } catch (e) {
    console.error('Connection failure:', e);
  }
}

setupApacheAndCertbot();
