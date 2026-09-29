import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth.js';
import { db } from '../../../shared/db/index.js';
import { eq, or, and, desc, sql } from 'drizzle-orm';
import { resolveTenantId } from '../../../../server.js';
import { todo_tasks, todo_comments, users } from '../../../shared/db/schema.js';

const router = Router();

// GET /api/todo/summary
router.get('/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const tasks = await db.select({
      status: todo_tasks.status,
      dueDate: todo_tasks.dueDate,
    })
    .from(todo_tasks)
    .where(
      and(
        eq(todo_tasks.companyId, companyId),
        or(
          eq(todo_tasks.assignedToUid, uid),
          eq(todo_tasks.assignedByUid, uid)
        )
      )
    );

    const summary = {
      total: tasks.length,
      toDo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    };

    const today = new Date().toISOString().split('T')[0];

    for (const task of tasks) {
      if (task.status === 'To Do') summary.toDo++;
      if (task.status === 'In Progress') summary.inProgress++;
      if (task.status === 'Completed') summary.completed++;
      
      if (task.dueDate && task.status !== 'Completed' && task.dueDate < today) {
        summary.overdue++;
      }
    }

    res.json(summary);
  } catch (err: any) {
    console.error('Failed to get todo summary:', err);
    res.status(500).json({ error: 'Failed to get todo summary' });
  }
});

// GET /api/todo
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { status, priority, limit } = req.query;

    const conditions = [
      eq(todo_tasks.companyId, companyId),
      or(
        eq(todo_tasks.assignedToUid, uid),
        eq(todo_tasks.assignedByUid, uid)
      )
    ];

    if (status) conditions.push(eq(todo_tasks.status, status as string));
    if (priority) conditions.push(eq(todo_tasks.priority, priority as string));

    let query = db.select({
      id: todo_tasks.id,
      title: todo_tasks.title,
      description: todo_tasks.description,
      priority: todo_tasks.priority,
      status: todo_tasks.status,
      dueDate: todo_tasks.dueDate,
      createdAt: todo_tasks.createdAt,
      assignedTo: {
        uid: users.uid,
        name: users.name
      }
    })
    .from(todo_tasks)
    .leftJoin(users, eq(todo_tasks.assignedToUid, users.uid))
    .where(and(...conditions))
    .orderBy(desc(todo_tasks.createdAt));

    if (limit) {
      query = query.limit(Number(limit)) as any;
    }

    const tasks = await query;
    res.json(tasks);
  } catch (err: any) {
    console.error('Failed to list tasks:', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// POST /api/todo
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, priority, startDate, dueDate, assignedToUid } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const [task] = await db.insert(todo_tasks).values({
      companyId,
      title,
      description,
      priority: priority || 'Medium',
      startDate: startDate || null,
      dueDate: dueDate || null,
      assignedByUid: uid,
      assignedToUid: assignedToUid || uid,
      status: 'To Do'
    }).returning();

    res.status(201).json(task);
  } catch (err: any) {
    console.error('Failed to create task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/todo/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const [task] = await db.select({
      task: todo_tasks,
      assignedTo: {
        uid: users.uid,
        name: users.name
      }
    })
    .from(todo_tasks)
    .leftJoin(users, eq(todo_tasks.assignedToUid, users.uid))
    .where(and(
      eq(todo_tasks.id, req.params.id),
      eq(todo_tasks.companyId, companyId)
    ));

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const commentsList = await db.select({
      id: todo_comments.id,
      body: todo_comments.body,
      createdAt: todo_comments.createdAt,
      authorUid: todo_comments.authorUid,
      author: {
        name: users.name
      }
    })
    .from(todo_comments)
    .leftJoin(users, eq(todo_comments.authorUid, users.uid))
    .where(eq(todo_comments.taskId, req.params.id))
    .orderBy(desc(todo_comments.createdAt));

    res.json({ ...task.task, assignedTo: task.assignedTo, comments: commentsList });
  } catch (err: any) {
    console.error('Failed to get task:', err);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// PUT /api/todo/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const { title, description, priority, startDate, dueDate, assignedToUid } = req.body;
    
    const [updated] = await db.update(todo_tasks).set({
      title,
      description,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      assignedToUid,
      updatedAt: sql`now()`
    })
    .where(and(
      eq(todo_tasks.id, req.params.id),
      eq(todo_tasks.companyId, companyId)
    )).returning();

    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('Failed to update task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/todo/:id/status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const [updated] = await db.update(todo_tasks).set({
      status,
      updatedAt: sql`now()`
    })
    .where(and(
      eq(todo_tasks.id, req.params.id),
      eq(todo_tasks.companyId, companyId)
    )).returning();

    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('Failed to update task status:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// DELETE /api/todo/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    
    const uid = req.user?.uid;
    
    // Only assignedBy can delete
    const [deleted] = await db.delete(todo_tasks)
    .where(and(
      eq(todo_tasks.id, req.params.id),
      eq(todo_tasks.companyId, companyId),
      eq(todo_tasks.assignedByUid, uid as string)
    )).returning();

    if (!deleted) return res.status(403).json({ error: 'Forbidden or task not found' });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/todo/:id/comments
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = await resolveTenantId(req);
    if (!companyId) return res.status(400).json({ error: 'Missing company context' });
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'Comment body is required' });

    const [comment] = await db.insert(todo_comments).values({
      taskId: req.params.id,
      authorUid: uid,
      body
    }).returning();

    res.status(201).json(comment);
  } catch (err: any) {
    console.error('Failed to add comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
