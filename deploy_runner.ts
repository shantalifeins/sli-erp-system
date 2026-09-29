import { pullAndDeploy } from './scripts/mcp-deploy-server';

async function run() {
  console.log('Starting deployment...');
  try {
    const result = await pullAndDeploy('10.16.49.78', 'iamadmin', 'main');
    console.log(result);
  } catch (err) {
    console.error('Error during deploy:', err);
  }
}

run();
