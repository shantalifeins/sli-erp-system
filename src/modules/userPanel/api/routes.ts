import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { db } from '../../../shared/db/index.js';
import { eq } from 'drizzle-orm';
import { resolveTenantId } from '../../../../server.js';
import { user_panel_settings, user_panel_permissions, purchase_requisitions, inbox_tasks, users } from '../../../shared/db/schema.js';
import { and, sql, or } from 'drizzle-orm';

const router = Router();

// Get metrics for User Panel Dashboard
router.get('/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    const uid = req.user?.uid;
    const role = req.user?.role;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Requisition Status Counts
    const reqStatusData = await db.select({
      status: purchase_requisitions.status,
      count: sql<number>`count(*)`.mapWith(Number)
    })
    .from(purchase_requisitions)
    .where(and(
      eq(purchase_requisitions.companyId, companyId),
      eq(purchase_requisitions.uid, uid)
    ))
    .groupBy(purchase_requisitions.status);

    // 2. Requisition Delivery Counts
    const reqDeliveryData = await db.select({
      deliveryStatus: purchase_requisitions.deliveryStatus,
      count: sql<number>`count(*)`.mapWith(Number)
    })
    .from(purchase_requisitions)
    .where(and(
      eq(purchase_requisitions.companyId, companyId),
      eq(purchase_requisitions.uid, uid)
    ))
    .groupBy(purchase_requisitions.deliveryStatus);

    const dbUser = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    const userDesignation = dbUser[0]?.designation;

    // 3. Inbox Tasks Counts by Category and Status (assigned to user, role, or designation)
    const inboxData = await db.select({
      category: inbox_tasks.category,
      status: inbox_tasks.status,
      count: sql<number>`count(*)`.mapWith(Number)
    })
    .from(inbox_tasks)
    .where(and(
      eq(inbox_tasks.companyId, companyId),
      or(
        eq(inbox_tasks.assignedToUid, uid),
        eq(inbox_tasks.assignedToRole, role || ''),
        eq(inbox_tasks.assignedToRole, userDesignation || '')
      )
    ))
    .groupBy(inbox_tasks.category, inbox_tasks.status);

    res.json({
      requisitionStatus: reqStatusData,
      requisitionDelivery: reqDeliveryData,
      inbox: inboxData
    });
  } catch (err) {
    console.error('GET /api/user-panel/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Get tasks for the authenticated user (global + personal)
router.get('/tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });

    // Global tasks (from settings) that are active
    const globalTasks = await db.select().from(user_panel_settings).where(eq(user_panel_settings.companyId, companyId));

    // No personal tasks needed – only global tasks are returned
    const tasks = globalTasks.map(g => ({
      id: g.id,
      key: g.taskKey,
      name: g.taskName,
      assigneeUid: g.defaultAssigneeUid,
      isGlobal: true,
      isActive: g.isActive,
    }));

    res.json(tasks);
  } catch (err) {
    console.error('GET /api/user-panel/tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create or update a global task template (admin only)
router.post('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const { taskKey, taskName, defaultAssigneeUid, isActive } = req.body;
    if (!companyId) return res.status(400).json({ error: 'Company required' });
    const result = await db.insert(user_panel_settings).values({
      companyId,
      taskKey,
      taskName,
      defaultAssigneeUid,
      isActive: isActive ?? true,
    }).returning();
    res.json(result[0]);
  } catch (err) {
    console.error('POST /api/user-panel/settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Update user-panel permissions for a specific user (admin only)
router.put('/permissions/:uid', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const { uid } = req.params;
    const { canView, canEdit, canAdmin } = req.body;
    if (!companyId) return res.status(400).json({ error: 'Company required' });

    const existing = await db.select().from(user_panel_permissions).where(eq(user_panel_permissions.userId, uid));
    if (existing.length > 0) {
      await db.update(user_panel_permissions)
        .set({ canView, canEdit, canAdmin })
        .where(eq(user_panel_permissions.userId, uid));
    } else {
      await db.insert(user_panel_permissions).values({
        userId: uid,
        companyId,
        canView: !!canView,
        canEdit: !!canEdit,
        canAdmin: !!canAdmin,
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/user-panel/permissions error:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

export default router;
