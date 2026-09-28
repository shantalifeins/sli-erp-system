import { pullAndDeploy } from '../dist/scripts/mcp-deploy-server.js';
// wait, the project uses dist folder?
// let's just use tsx to run it directly from ts files

import { pullAndDeploy } from './mcp-deploy-server.js';

async function deploy() {
  console.log("Starting MCP deployment to Live Server...");
  const output = await pullAndDeploy('10.16.49.78', 'iamadmin');
  console.log("Deployment Output:", output);
}

deploy().catch(console.error);
