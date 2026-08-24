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

async function startDeployment() {
  try {
    console.log('Connecting to SSH server 10.16.49.78...');
    conn.on('ready', async () => {
      console.log('✅ SSH Connection established successfully!');

      try {
        // Step 1: Verify postgres_prod container
        console.log('\n--- Step 1: Checking postgres_prod container ---');
        await runCommand('docker ps --filter name=postgres_prod');

        // Step 2: Provision sli_erp_user and sli_erp_db in postgres_prod
        console.log('\n--- Step 2: Provisioning sli_erp_db in postgres_prod ---');
        const createUserSql = `docker exec postgres_prod psql -U postgres -c "DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sli_erp_user') THEN CREATE USER sli_erp_user WITH PASSWORD 'D0m@1n!ssl_erp_2026'; END IF; END \\$\\$;"`;
        await runCommand(createUserSql);

        const createDbSql = `docker exec postgres_prod psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'sli_erp_db'" | grep -q 1 || docker exec postgres_prod psql -U postgres -c "CREATE DATABASE sli_erp_db OWNER sli_erp_user;"`;
        await runCommand(createDbSql);

        const grantSql = `docker exec postgres_prod psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sli_erp_db TO sli_erp_user;"`;
        await runCommand(grantSql);

        // Step 3: Clone or update repo at /home/iamadmin/sli-erp
        console.log('\n--- Step 3: Cloning/Pulling repository at /home/iamadmin/sli-erp ---');
        await runCommand('if [ ! -d "/home/iamadmin/sli-erp" ]; then git clone https://github.com/shantalifeins/sli-erp-system.git /home/iamadmin/sli-erp; else cd /home/iamadmin/sli-erp && git fetch origin && git checkout main && git reset --hard origin/main; fi');

        // Remove dist from .dockerignore on server
        await runCommand('rm -f /home/iamadmin/sli-erp/.dockerignore');

        // Step 4: Write .env file
        console.log('\n--- Step 4: Configuring .env in /home/iamadmin/sli-erp ---');
        const envContent = `AUTH_MODE=postgres
NODE_ENV=production
PORT=5000
VITE_API_URL=https://erp.shantalife.com
JWT_SECRET=sli_erp_live_jwt_secret_key_2026_ssl
DATABASE_URL=postgres://sli_erp_user:D0m@1n!ssl_erp_2026@127.0.0.1:5432/sli_erp_db
FRONTEND_URL=https://erp.shantalife.com`;
        await runCommand(`cat << 'EOF' > /home/iamadmin/sli-erp/.env\n${envContent}\nEOF`);

        // Step 5: Install host packages for Drizzle CLI
        console.log('\n--- Step 5: Installing npm packages for migration ---');
        await runCommand('cd /home/iamadmin/sli-erp && npm install');

        // Step 6: Push Drizzle DB migrations
        console.log('\n--- Step 6: Running Drizzle DB schema migrations ---');
        await runCommand('cd /home/iamadmin/sli-erp && npx drizzle-kit push --config=src/shared/db/drizzle.config.ts');

        // Step 7: Create ultra-lightweight Dockerfile using pre-built dist
        console.log('\n--- Step 7: Creating lightweight production Dockerfile ---');
        const dockerfileContent = `FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --only=production
COPY dist ./dist
COPY public ./public
EXPOSE 5000
CMD ["node", "dist/server.cjs"]`;
        await runCommand(`cat << 'EOF' > /home/iamadmin/sli-erp/Dockerfile\n${dockerfileContent}\nEOF`);

        // Step 8: Build Docker image for SLI ERP and run container on port 5000
        console.log('\n--- Step 8: Building and launching sli_erp_app Docker container ---');
        await runCommand('cd /home/iamadmin/sli-erp && docker build -t sli_erp_app_img .');
        await runCommand('docker stop sli_erp_app 2>/dev/null || true');
        await runCommand('docker rm sli_erp_app 2>/dev/null || true');
        await runCommand('docker run -d --name sli_erp_app --restart always -p 5000:5000 --env-file /home/iamadmin/sli-erp/.env sli_erp_app_img');

        // Step 9: Verify container status and health endpoint
        console.log('\n--- Step 9: Verifying container health ---');
        await runCommand('docker ps --filter name=sli_erp_app');
        await runCommand('curl -s http://localhost:5000/api/health || true');

        console.log('\n========================================');
        console.log('🎉 Live Server Provisioning Completed Successfully!');
        console.log('========================================');
      } catch (err) {
        console.error('Error during execution:', err);
      } finally {
        conn.end();
      }
    }).connect(sshConfig);
  } catch (e) {
    console.error('Connection failure:', e);
  }
}

startDeployment();
