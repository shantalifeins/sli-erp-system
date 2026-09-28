import { pullAndDeploy } from './mcp-deploy-server.js';

async function deploy() {
  try {
    console.log("Starting deployment...");
    const out = await pullAndDeploy('10.16.49.78', 'iamadmin');
    console.log("Deploy Output:");
    console.log(out);
  } catch (err) {
    console.error("Deploy Error:", err);
  }
}

deploy();
