import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * MCP Deployment Server Script for SLI ERP System
 * 
 * Mandated Workflow:
 * 1. Developer pushes local code changes to Git repository.
 * 2. MCP Deployment Tool triggers `git pull origin main` on the remote server.
 * 3. Builds and restarts the `sli_erp_app` container and runs DB migrations.
 * 
 * Direct file pushing/copying is forbidden; all code changes MUST go through Git.
 */

// Command Validation & Security Guardrails
export function validateCommand(command: string): { allowed: boolean; reason?: string } {
  const lower = command.toLowerCase();
  
  // Forbidden Keywords & Target Blockers
  const forbiddenTargets = ['chatwoot', 'n8n', 'mariadb', 'espocrm', 'metabase', 'redis'];
  for (const target of forbiddenTargets) {
    if (lower.includes(target)) {
      return { allowed: false, reason: `Action blocked: Commands targeting '${target}' are forbidden.` };
    }
  }

  // Dangerous System-wide Destructive Actions
  const forbiddenOps = ['docker system prune', 'rm -rf /', 'drop database', 'truncate', 'reboot', 'shutdown'];
  for (const op of forbiddenOps) {
    if (lower.includes(op)) {
      return { allowed: false, reason: `Action blocked: Hazardous command '${op}' is forbidden.` };
    }
  }

  return { allowed: true };
}

/**
 * Triggers deployment on remote server strictly via Git pull.
 */
export async function pullAndDeploy(host: string, user: string, branch: string = 'main', sshKeyPath?: string): Promise<string> {
  const keyFlag = sshKeyPath ? `-i ${sshKeyPath}` : '';
  const deployCmd = `ssh -o StrictHostKeyChecking=no ${keyFlag} ${user}@${host} "cd /home/iamadmin/sli-erp && git fetch origin && git checkout ${branch} && git reset --hard origin/${branch} && docker build -t sli_erp_app_img . && docker restart sli_erp_app"`;
  
  const check = validateCommand(deployCmd);
  if (!check.allowed) throw new Error(check.reason);

  try {
    const output = execSync(deployCmd, { encoding: 'utf-8' });
    return output;
  } catch (err: any) {
    return `Deployment failed: ${err.message}`;
  }
}

export async function checkServerHealth(host: string, user: string, sshKeyPath?: string): Promise<string> {
  const keyFlag = sshKeyPath ? `-i ${sshKeyPath}` : '';
  const sshCmd = `ssh -o StrictHostKeyChecking=no ${keyFlag} ${user}@${host} "docker ps --filter name=sli_erp_app && curl -s http://localhost:5000/api/health"`;
  const check = validateCommand(sshCmd);
  if (!check.allowed) throw new Error(check.reason);

  try {
    const output = execSync(sshCmd, { encoding: 'utf-8' });
    return output;
  } catch (err: any) {
    return `Server health check response: ${err.message}`;
  }
}

export async function runRemoteMigration(host: string, user: string, dbUrl: string, sshKeyPath?: string): Promise<string> {
  const keyFlag = sshKeyPath ? `-i ${sshKeyPath}` : '';
  const cmd = `ssh -o StrictHostKeyChecking=no ${keyFlag} ${user}@${host} "cd /home/iamadmin/sli-erp && DATABASE_URL='${dbUrl}' npx drizzle-kit push"`;
  const check = validateCommand(cmd);
  if (!check.allowed) throw new Error(check.reason);

  try {
    const output = execSync(cmd, { encoding: 'utf-8' });
    return output;
  } catch (err: any) {
    return `Migration output: ${err.message}`;
  }
}

console.log("🚀 SLI ERP Git-Centric Deployment MCP Server initialized with strict guardrails.");
