import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/shared/db';
import { companies, users } from '../src/shared/db/schema';
import { eq, ilike } from 'drizzle-orm';

describe('Database Integrations - ABC Company', () => {
  let abcCompanyId: string;

  beforeAll(async () => {
    // Attempt to find ABC company
    const companyList = await db.select().from(companies).where(ilike(companies.name, '%abc%'));
    if (companyList.length > 0) {
      abcCompanyId = companyList[0].id;
    }
  });

  it('Should connect to the database and find ABC Company', async () => {
    expect(abcCompanyId).toBeDefined();
    expect(typeof abcCompanyId).toBe('string');
  });

  it('Should be able to query users for ABC Company', async () => {
    if (!abcCompanyId) return; // Skip if no company
    const abcUsers = await db.select().from(users).where(eq(users.companyId, abcCompanyId));
    expect(Array.isArray(abcUsers)).toBe(true);
  });
});
