import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { db } from '../../../shared/db/index.js';
import { eq, and } from 'drizzle-orm';
import { resolveTenantId } from '../../../../server.js';
import { 
  profile_change_requests, 
  users, 
  bpmn_definitions, 
  document_approvals, 
  inbox_tasks, 
  smtp_settings, 
  notifications 
} from '../../../shared/db/schema.js';
import { evaluateWorkflowPath } from '../../../shared/lib/bpmnParser.js';
import nodemailer from 'nodemailer';

const router = Router();

// Get the user's pending profile change request
router.get('/pending', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    // Find the user's ID
    const userResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
    const user = userResult[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const requests = await db.select().from(profile_change_requests)
      .where(and(
        eq(profile_change_requests.userId, user.id),
        eq(profile_change_requests.status, 'Pending')
      )).limit(1);

    res.json(requests[0] || null);
  } catch (err) {
    console.error('GET /api/profile/change-request/pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Get a specific profile change request (for approvers)
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const request = await db.select().from(profile_change_requests)
      .where(eq(profile_change_requests.id, parseInt(req.params.id))).limit(1);
      
    if (!request.length) return res.status(404).json({ error: 'Request not found' });
    
    const userResult = await db.select().from(users).where(eq(users.id, request[0].userId)).limit(1);
    
    res.json({
      request: request[0],
      user: userResult[0]
    });
  } catch (err) {
    console.error('GET /api/profile/change-requests/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Submit a new profile change request
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const userResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
    const user = userResult[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already pending
    const existing = await db.select().from(profile_change_requests)
      .where(and(eq(profile_change_requests.userId, user.id), eq(profile_change_requests.status, 'Pending'))).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: 'You already have a pending request.' });

    const requestedData = req.body;

    // Insert request
    const inserted = await db.insert(profile_change_requests).values({
      companyId,
      userId: user.id,
      requestedData,
      status: 'Pending'
    }).returning();
    const request = inserted[0];

    // BPMN Workflow logic
    const defs = await db.select().from(bpmn_definitions)
      .where(and(
        eq(bpmn_definitions.companyId, companyId), 
        eq(bpmn_definitions.documentType, 'Profile Data Change Request'), 
        eq(bpmn_definitions.isActive, true)
      ));
      
    let stepOrder = 1;
    let approvalsToInsert: any[] = [];
    let firstStepAssigneeRole = 'HR';
    let firstStepAssigneeUid = null;

    if (defs.length > 0) {
      const xmlData = defs[0].xmlData;
      const path = evaluateWorkflowPath(xmlData, { department: user.department || 'Global' });
      
      for (const task of path) {
        approvalsToInsert.push({
          companyId: companyId,
          documentType: 'Profile Data Change Request',
          documentId: request.id,
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
        companyId: companyId,
        category: 'User Panel',
        title: `Profile Data Change Request: ${user.name}`,
        message: `Employee ${user.name} has requested to change their profile data.`,
        status: 'Pending',
        referenceType: 'Profile Data Change Request',
        referenceId: request.id,
        assignedToRole: firstStepAssigneeRole,
        assignedToUid: firstStepAssigneeUid
      });
    } else {
      // Auto-approve profile change request if no workflow is configured
      await db.update(profile_change_requests)
        .set({ status: 'Approved' })
        .where(eq(profile_change_requests.id, request.id));
      request.status = 'Approved';

      // Merge changes directly into user record
      const updateData: any = {};
      if (requestedData?.phone) updateData.phone = requestedData.phone;
      if (requestedData?.address) updateData.address = requestedData.address;
      if (requestedData?.emergencyContact) updateData.emergencyContact = requestedData.emergencyContact;
      if (requestedData?.avatarUrl) updateData.avatarUrl = requestedData.avatarUrl;

      if (Object.keys(updateData).length > 0) {
        await db.update(users)
          .set(updateData)
          .where(and(eq(users.uid, req.user!.uid), eq(users.companyId, companyId)));
      }
    }

    res.json(request);
  } catch (err) {
    console.error('POST /api/profile/change-request error:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Approve or Reject a profile change request
router.post('/:id/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const requestId = parseInt(req.params.id);
    const { action, comments, modifiedData } = req.body;
    
    if (!action) return res.status(400).json({ error: 'Action is required' });

    const requestResult = await db.select().from(profile_change_requests).where(eq(profile_change_requests.id, requestId)).limit(1);
    const request = requestResult[0];
    if (!request || request.status !== 'Pending') return res.status(400).json({ error: 'Request is not pending' });

    const userResult = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
    const user = userResult[0];

    if (action === 'Approved' || action === 'Approve') {
      const pendingSteps = await db.select().from(document_approvals)
        .where(and(
          eq(document_approvals.documentType, 'Profile Data Change Request'),
          eq(document_approvals.documentId, request.id),
          eq(document_approvals.status, 'Pending')
        )).orderBy(document_approvals.stepOrder);

      const isFinalStep = pendingSteps.length <= 1;

      if (pendingSteps.length > 0) {
        await db.update(document_approvals)
          .set({ status: 'Approved', approvedBy: req.user!.uid, comments })
          .where(eq(document_approvals.id, pendingSteps[0].id));
      }

      if (isFinalStep) {
        // Final approval: update user table
        const finalData = modifiedData || request.requestedData;
        await db.update(users).set({
          phone: finalData.phone !== undefined ? finalData.phone : user.phone,
          department: finalData.department !== undefined ? finalData.department : user.department,
          designation: finalData.designation !== undefined ? finalData.designation : user.designation,
          role: finalData.role !== undefined ? finalData.role : user.role,
          supervisorUid: finalData.supervisorUid !== undefined ? finalData.supervisorUid : user.supervisorUid,
          branchId: finalData.branchId !== undefined ? finalData.branchId : user.branchId,
        }).where(eq(users.id, user.id));

        await db.update(profile_change_requests).set({ status: 'Approved', requestedData: finalData }).where(eq(profile_change_requests.id, request.id));

        // Create in-app notification
        await db.insert(notifications).values({
          userId: user.uid,
          title: 'Profile Update Approved',
          message: 'Your profile data change request has been approved and your profile is updated.',
          type: 'INFO'
        });

        // Send email
        const smtp = await db.select().from(smtp_settings).where(eq(smtp_settings.companyId, user.companyId!)).limit(1);
        if (smtp.length > 0) {
          const conf = smtp[0];
          const transporter = nodemailer.createTransport({
            host: conf.host,
            port: conf.port,
            secure: conf.secure,
            auth: { user: conf.username, pass: conf.password }
          });
          
          await transporter.sendMail({
            from: `"${conf.fromName}" <${conf.fromEmail}>`,
            to: user.email,
            subject: 'Profile Update Approved',
            html: `<p>Hello ${user.name},</p><p>Your profile data change request has been approved.</p>`
          }).catch(err => console.error("SMTP error:", err));
        }
      } else {
        // Next step
        const nextStep = pendingSteps[1];
        let nextAssigneeRole = nextStep.assigneeValue || nextStep.roleRequired;
        let nextAssigneeUid = null;
        if (nextStep.assigneeType === 'Specific User') {
          nextAssigneeUid = nextStep.assigneeValue;
          nextAssigneeRole = null;
        }
        await db.insert(inbox_tasks).values({
          companyId: request.companyId!,
          category: 'User Panel',
          title: `Profile Data Change Request Approval Required: ${user.name}`,
          message: `Employee ${user.name} has requested to change their profile data.`,
          status: 'Pending',
          referenceType: 'Profile Data Change Request',
          referenceId: request.id,
          assignedToRole: nextAssigneeRole,
          assignedToUid: nextAssigneeUid
        });
      }
    } else if (action === 'Rejected' || action === 'Reject') {
      await db.update(profile_change_requests).set({ status: 'Rejected' }).where(eq(profile_change_requests.id, request.id));
      await db.update(document_approvals)
        .set({ status: 'Rejected', approvedBy: req.user!.uid, comments })
        .where(and(
          eq(document_approvals.documentType, 'Profile Data Change Request'),
          eq(document_approvals.documentId, request.id),
          eq(document_approvals.status, 'Pending')
        ));
        
      // Notify rejection
      await db.insert(notifications).values({
        userId: user.uid,
        title: 'Profile Update Rejected',
        message: 'Your profile data change request has been rejected.',
        type: 'WARNING'
      });
    }

    // Mark current inbox task as completed globally
    await db.update(inbox_tasks).set({
      status: 'Completed',
      actionResult: action,
      updatedAt: new Date()
    }).where(and(
      eq(inbox_tasks.referenceType, 'Profile Data Change Request'),
      eq(inbox_tasks.referenceId, request.id),
      eq(inbox_tasks.status, 'Pending')
    ));

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/profile/change-request/:id/approve error:', err);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

export default router;
