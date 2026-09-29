import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../src/shared/db/index.js';
import { todo_tasks, companies, users, company_plugins } from '../src/shared/db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAuthToken } from '../src/shared/lib/authUtils.js';

describe('To-Do List API', () => {
  let token: string;
  let companyId: string;
  let userId: string;
  let taskId: string;

  beforeAll(async () => {
    // 1. Create a dummy company
    const [company] = await db.insert(companies).values({
      name: 'Test Company Todo',
      slug: 'test-todo-' + Date.now(),
    }).returning();
    companyId = company.id;

    // 2. Create a dummy user
    userId = 'todo-test-user-' + Date.now();
    await db.insert(users).values({
      uid: userId,
      email: 'todo@test.com',
      companyId: companyId,
      name: 'Test User'
    });

    // 3. Generate Auth token
    token = generateAuthToken({ uid: userId, email: 'todo@test.com', role: 'Admin', companyId });

    // 4. Create user-panel plugin link
    // We assume the plugin already exists in tests because global seed usually runs, but just in case, we will insert it directly via SQL if missing, or we can just mock it. Wait, the DB is persistent across tests or cleaned up.
    // Instead of querying, we can just insert the company_plugin mapping for the first plugin that matches 'user-panel'.
    const userPanelPlugin = await db.query.plugins.findFirst({
      where: (plugins, { eq }) => eq(plugins.slug, 'user-panel')
    });
    if (userPanelPlugin) {
      await db.insert(company_plugins).values({
        companyId,
        pluginId: userPanelPlugin.id,
        status: 'active'
      });
    }
  });

  afterAll(async () => {
    await db.delete(todo_tasks).where(eq(todo_tasks.companyId, companyId));
    await db.delete(users).where(eq(users.uid, userId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  it('should create a new task', async () => {
    const res = await request(app)
      .post('/api/todo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Task 1',
        description: 'Test description',
        priority: 'High',
        assignedToUid: userId
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Task 1');
    expect(res.body.priority).toBe('High');
    expect(res.body.status).toBe('To Do');
    taskId = res.body.id;
  });

  it('should get tasks list', async () => {
    const res = await request(app)
      .get('/api/todo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].title).toBe('Test Task 1');
  });

  it('should get a task by id with comments array', async () => {
    const res = await request(app)
      .get(`/api/todo/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it('should update a task', async () => {
    const res = await request(app)
      .put(`/api/todo/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Task 1',
        priority: 'Low',
        assignedToUid: userId
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Task 1');
    expect(res.body.priority).toBe('Low');
  });

  it('should update task status', async () => {
    const res = await request(app)
      .patch(`/api/todo/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'In Progress'
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
  });

  it('should get summary', async () => {
    const res = await request(app)
      .get(`/api/todo/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body.inProgress).toBe(1);
  });

  it('should add a comment', async () => {
    const res = await request(app)
      .post(`/api/todo/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        body: 'This is a test comment'
      });

    expect(res.status).toBe(201);
    expect(res.body.body).toBe('This is a test comment');
  });

  it('should delete a task', async () => {
    const res = await request(app)
      .delete(`/api/todo/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
