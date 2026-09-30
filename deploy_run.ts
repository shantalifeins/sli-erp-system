import { pullAndDeploy } from './scripts/mcp-deploy-server.js';
(async () => {
  try {
    console.log("Starting deployment...");
    const res = await pullAndDeploy('10.16.49.78', 'iamadmin', 'main');
    console.log(res);
  } catch(e) {
    console.error(e);
  }
})();
