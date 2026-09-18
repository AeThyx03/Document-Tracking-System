import bcrypt from 'bcryptjs';
import { db } from '../db/index.ts';
import { users, personnel } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';

/**
 * Ensures system admin default account is present and active in the database.
 * Runs on server startup in both development and production.
 */
export async function bootstrapSystemAdmin(): Promise<void> {
  try {
    const defaultPassword = process.env.DEV_ADMIN_PASSWORD || 'dev_admin';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, 'dev_admin'),
          eq(users.email, 'dev-admin@localhost.test')
        )
      )
      .limit(1);

    let userId: number;

    if (!existingUser) {
      const [inserted] = await db
        .insert(users)
        .values({
          username: 'dev_admin',
          email: 'dev-admin@localhost.test',
          passwordHash,
          role: 'System Admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: users.id });
      userId = inserted.id;
      console.log('[BOOTSTRAP] Initialized default system admin account (dev_admin).');
    } else {
      userId = existingUser.id;
      // Ensure it is active
      if (!existingUser.isActive || !existingUser.passwordHash) {
        await db
          .update(users)
          .set({
            isActive: true,
            passwordHash: existingUser.passwordHash || passwordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        console.log('[BOOTSTRAP] Verified and reactivated default system admin user.');
      }
    }

    // Ensure linked personnel record exists
    const [existingPersonnel] = await db
      .select()
      .from(personnel)
      .where(
        or(
          eq(personnel.username, 'dev_admin'),
          eq(personnel.email, 'dev-admin@localhost.test'),
          eq(personnel.userId, userId)
        )
      )
      .limit(1);

    if (!existingPersonnel) {
      await db.insert(personnel).values({
        userId,
        name: 'Development System Admin',
        username: 'dev_admin',
        email: 'dev-admin@localhost.test',
        role: 'System Admin',
        division: 'Development',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log('[BOOTSTRAP] Initialized default system admin personnel profile.');
    } else if (existingPersonnel.status !== 'active') {
      await db
        .update(personnel)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(personnel.id, existingPersonnel.id));
    }
  } catch (err) {
    console.warn('[BOOTSTRAP] Non-fatal admin bootstrap notice:', err);
  }
}
