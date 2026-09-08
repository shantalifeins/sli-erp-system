import { Router } from 'express';
import { db } from '../../../shared/db/index.js';
import { companies, users, inbox_tasks, smtp_settings, bpmn_definitions, document_approvals } from '../../../shared/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { evaluateWorkflowPath } from '../../../shared/lib/bpmnParser.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const ssoRouter = Router();

// Endpoint to fetch SSO Config for a domain
ssoRouter.get('/sso-config', async (req, res) => {
  const { domain } = req.query;
  if (!domain || typeof domain !== 'string') return res.status(400).json({ error: 'Domain is required' });

  try {
    const companyResult = await db.select().from(companies).where(eq(companies.ssoEmailDomain, domain)).limit(1);
    if (!companyResult || companyResult.length === 0 || !companyResult[0].isSsoEnabled) {
      return res.status(404).json({ error: 'SSO is not enabled for this domain.' });
    }
    
    res.json({
      clientId: companyResult[0].ssoClientId,
      tenantId: companyResult[0].ssoTenantId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch SSO config' });
  }
});

// Endpoint to process Microsoft Login
ssoRouter.post('/microsoft', async (req, res) => {
  const { accessToken, domain } = req.body;
  
  if (!accessToken || !domain) {
    return res.status(400).json({ error: 'accessToken and domain are required' });
  }

  try {
    // Verify Company again
    const companyResult = await db.select().from(companies).where(eq(companies.ssoEmailDomain, domain)).limit(1);
    const company = companyResult[0];
    
    if (!company || !company.isSsoEnabled) {
      return res.status(403).json({ error: 'SSO not enabled for this domain' });
    }

    // Verify token with MS Graph
    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!graphRes.ok) {
      return res.status(401).json({ error: 'Invalid Microsoft token' });
    }

    const graphData = await graphRes.json();
    const email = graphData.mail || graphData.userPrincipalName;
    
    if (!email || !email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
       return res.status(403).json({ error: 'Email does not match the company domain' });
    }

    // Check if user exists
    const userResult = await db.select().from(users).where(eq(users.email, email)).orderBy(asc(users.id)).limit(1);
    let user = userResult[0];

    const randomPassword = crypto.randomUUID() + "A1!a";

    if (user) {
      // Find the user's actual company to ensure they are allowed to use SSO
      const userCompanyResult = await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1);
      const userCompany = userCompanyResult[0];
      if (!userCompany || !userCompany.isSsoEnabled) {
         return res.status(403).json({ error: 'SSO is disabled for your company account. Please use the direct Email & Password login.' });
      }
    }

    if (!user) {
      // Create in GoTrue
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { name: graphData.displayName || 'New Employee' }
      });

      if (authError) {
        return res.status(500).json({ error: 'Failed to sync with auth server: ' + authError.message });
      }

      // Create in local DB
      const insertedUser = await db.insert(users).values({
        uid: authData.user.id,
        email: email,
        name: graphData.displayName || 'New Employee',
        companyId: company.id,
        status: 'Pending HR Approval'
      }).returning();
      user = insertedUser[0];

      // Check for dynamic BPMN workflow
      const defs = await db.select().from(bpmn_definitions)
        .where(and(eq(bpmn_definitions.companyId, company.id), eq(bpmn_definitions.documentType, 'User Registration'), eq(bpmn_definitions.isActive, true)));
      
      let stepOrder = 1;
      let approvalsToInsert: any[] = [];
      let firstStepAssigneeRole = 'HR';
      let firstStepAssigneeUid = null;

      if (defs.length > 0) {
        const xmlData = defs[0].xmlData;
        const path = evaluateWorkflowPath(xmlData, { department: 'Global' });
        
        for (const task of path) {
          approvalsToInsert.push({
            companyId: company.id,
            documentType: 'User Registration',
            documentId: user.id,
            stepOrder: stepOrder++,
            roleRequired: task.assigneeValue,
            assigneeType: task.assigneeType,
            assigneeValue: task.assigneeValue,
            status: 'Pending'
          });
        }
      }

      if (approvalsToInsert.length > 0) {
        await db.insert(document_approvals).values(approvalsToInsert);
        const firstStep = approvalsToInsert.find(a => a.stepOrder === 1);
        if (firstStep) {
          if (firstStep.assigneeType === 'Specific User') {
            firstStepAssigneeUid = firstStep.assigneeValue;
            firstStepAssigneeRole = null;
          } else {
            firstStepAssigneeRole = firstStep.assigneeValue || firstStep.roleRequired;
          }
        }

        // Insert Inbox task
        await db.insert(inbox_tasks).values({
          companyId: company.id,
          category: 'System',
          title: `New Employee Onboarding: ${user.name}`,
          message: `Employee ${user.name} (${user.email}) registered via SSO and is waiting for Role and Branch assignment.`,
          status: 'Pending',
          referenceType: 'User Registration',
          referenceId: user.id,
          assignedToRole: firstStepAssigneeRole,
          assignedToUid: firstStepAssigneeUid
        });

        return res.status(202).json({ status: 'pending', message: 'Account is pending HR approval.' });
      } else {
        // Auto-approve user registration if no workflow is configured
        await db.update(users)
          .set({ status: 'Active' })
          .where(eq(users.id, user.id));
        user.status = 'Active';
      }
    } else {
      // User exists locally. If they somehow don't exist in GoTrue, generateLink will fail later.
      // We no longer overwrite their password here so they can retain their direct login credentials.
    }

    if (user.status === 'Pending HR Approval') {
      return res.status(202).json({ status: 'pending', message: 'Account is still pending HR approval.' });
    }
    
    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Account is suspended.' });
    }

    // Generate a secure session using a magic link OTP to avoid changing the user's password
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    });

    if (linkError) {
      console.error('Failed to generate session link:', linkError.message);
      return res.status(500).json({ error: 'Failed to generate session link: ' + linkError.message });
    }

    const otp = linkData.properties?.email_otp;
    const vType = linkData.properties?.verification_type;

    if (!otp) {
      return res.status(500).json({ error: 'Failed to extract OTP from session link' });
    }

    // NOW generate a REAL Supabase session by verifying the OTP
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.verifyOtp({
      email: user.email,
      token: otp,
      type: vType as any
    });

    if (signInError) {
      console.error("Supabase Login Error:", signInError.message);
      return res.status(500).json({ error: 'Failed to generate session: ' + signInError.message });
    }

    res.json({ 
      token: sessionData.session.access_token, 
      refreshToken: sessionData.session.refresh_token,
      user: { id: user.uid, email: user.email, name: user.name, role: user.role } 
    });

  } catch (err: any) {
    console.error('SSO error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

import { requireAuth } from '../../../shared/middleware/auth.js';

// Endpoint for HR to approve a pending user (Requires Admin role)
ssoRouter.post('/approve-user', requireAuth, async (req: any, res: any) => {
  const { userId, role, branchId, department, designation, action, comments } = req.body;

  if (!userId || !action) return res.status(400).json({ error: 'Missing userId or action' });

  try {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'Pending HR Approval' && user.status !== 'Pending Approval') return res.status(400).json({ error: 'User is not pending approval' });

    if (action === 'Approved' || action === 'Approve') {
      // Check for dynamic steps
      const pendingSteps = await db.select().from(document_approvals)
        .where(and(
          eq(document_approvals.documentType, 'User Registration'),
          eq(document_approvals.documentId, userId),
          eq(document_approvals.status, 'Pending')
        )).orderBy(document_approvals.stepOrder);

      const isFinalStep = pendingSteps.length <= 1;

      if (pendingSteps.length > 0) {
        await db.update(document_approvals)
          .set({ status: 'Approved', approvedBy: req.user.uid, comments })
          .where(eq(document_approvals.id, pendingSteps[0].id));
      }

      if (isFinalStep) {
        if (!role || !branchId) return res.status(400).json({ error: 'Role and branchId are required for final approval' });
        
        await db.update(users).set({
          role: role,
          branchId: branchId,
          department: department || null,
          designation: designation || null,
          status: 'Active',
        }).where(eq(users.id, userId));

      // Send email
      const smtp = await db.select().from(smtp_settings).where(eq(smtp_settings.companyId, user.companyId!)).limit(1);
      if (smtp.length > 0) {
        const conf = smtp[0];
        const transporter = nodemailer.createTransport({
          host: conf.host,
          port: conf.port,
          secure: conf.secure,
          auth: {
            user: conf.username,
            pass: conf.password
          }
        });
        
        await transporter.sendMail({
          from: `"${conf.fromName}" <${conf.fromEmail}>`,
          to: user.email,
          subject: 'Your Account Has Been Approved',
          html: `<p>Hello ${user.name},</p><p>Your account has been approved by HR. You can now login to the system using Microsoft SSO.</p>`
        });
      }
      } else {
        // Not final step, trigger next step's inbox task
        const nextStep = pendingSteps[1];
        let nextAssigneeRole = nextStep.assigneeValue || nextStep.roleRequired;
        let nextAssigneeUid = null;
        if (nextStep.assigneeType === 'Specific User') {
          nextAssigneeUid = nextStep.assigneeValue;
          nextAssigneeRole = null;
        }
        await db.insert(inbox_tasks).values({
          companyId: user.companyId!,
          category: 'System',
          title: `User Onboarding Approval Required: ${user.name}`,
          message: `Employee ${user.name} (${user.email}) registered via SSO and requires your onboarding approval.`,
          status: 'Pending',
          referenceType: 'User Registration',
          referenceId: user.id,
          assignedToRole: nextAssigneeRole,
          assignedToUid: nextAssigneeUid
        });
      }
    } else if (action === 'Rejected' || action === 'Reject') {
      await db.update(users).set({ status: 'Inactive' }).where(eq(users.id, userId));
      await db.update(document_approvals)
        .set({ status: 'Rejected', approvedBy: req.user.uid, comments })
        .where(and(
          eq(document_approvals.documentType, 'User Registration'),
          eq(document_approvals.documentId, userId),
          eq(document_approvals.status, 'Pending')
        ));
    }

    // Mark task as completed
    await db.update(inbox_tasks).set({
      status: 'Completed',
      actionResult: action,
      updatedAt: new Date()
    }).where(and(
      eq(inbox_tasks.referenceType, 'User Registration'),
      eq(inbox_tasks.referenceId, userId),
      eq(inbox_tasks.status, 'Pending')
    ));

    res.json({ success: true });
  } catch (err: any) {
    console.error('Approve User Error:', err);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

export default ssoRouter;
