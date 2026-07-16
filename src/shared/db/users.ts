import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';

export async function getUser(uid: string, email: string) {
  // First, check if the user exists by UID
  const byUid = await db.select().from(users).where(eq(users.uid, uid));
  if (byUid.length > 0) return byUid[0];

  // If not found by UID, check if they exist by email (pre-created by admin)
  const byEmail = await db.select().from(users).where(eq(users.email, email));
  if (byEmail.length > 0) {
    // Link the UID to this user
    const updated = await db.update(users)
      .set({ uid })
      .where(eq(users.id, byEmail[0].id))
      .returning();
    return updated[0];
  }

  // Allow the initial creators to login automatically
  if (email === 'jetitbd@gmail.com' || email === 'shantalifeins@gmail.com') {
    const newAdmin = await db.insert(users).values({ uid, email, role: 'Super Admin' }).returning();
    return newAdmin[0];
  }

  return null; // Not found and not authorized to create
}
