import { db } from './index.js';
import { users } from './schema.js';
import { eq, ilike } from 'drizzle-orm';
import crypto from 'crypto';

export async function getUser(uid: string, email: string) {
  // First, check if the user exists by UID
  if (uid) {
    const byUid = await db.select().from(users).where(eq(users.uid, uid));
    if (byUid.length > 0) return byUid[0];
  }

  // If not found by UID, check if they exist by email (pre-created by admin)
  if (email) {
    const byEmail = await db.select().from(users).where(ilike(users.email, email.trim()));
    if (byEmail.length > 0) {
      let effectiveUid = uid || byEmail[0].uid;
      if (!effectiveUid) {
        effectiveUid = crypto.randomUUID();
      }
      if (byEmail[0].uid !== effectiveUid) {
        const updated = await db.update(users)
          .set({ uid: effectiveUid })
          .where(eq(users.id, byEmail[0].id))
          .returning();
        return updated[0];
      }
      return byEmail[0];
    }
  }

  // Allow initial super admin creators to login automatically
  const lowerEmail = (email || '').toLowerCase().trim();
  if (lowerEmail === 'jetitbd@gmail.com' || lowerEmail === 'shantalifeins@gmail.com') {
    const effectiveUid = uid || crypto.randomUUID();
    const newAdmin = await db.insert(users).values({ uid: effectiveUid, email: lowerEmail, role: 'Super Admin' }).returning();
    return newAdmin[0];
  }

  return null; // Not found and not authorized to create
}
