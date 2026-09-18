import { db, pool } from './index.ts';
import { users, personnel } from './schema.ts';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedDev() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.error('FATAL: Cannot run development seed in production mode.');
    process.exit(1);
  }

  const devPassword = process.env.DEV_ADMIN_PASSWORD;
  
  if (!devPassword) {
    console.error('FATAL: DEV_ADMIN_PASSWORD environment variable is required to run the development seed.');
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(devPassword, 10);

  const username = 'dev_admin';
  const email = 'dev-admin@localhost.test';

  try {
    console.log('Starting development seed...');

    const [user] = await db.insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: 'System Admin',
        isActive: true
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          username,
          passwordHash,
          role: 'System Admin',
          isActive: true
        }
      })
      .returning({ id: users.id });

    await db.insert(personnel)
      .values({
        userId: user.id,
        name: 'Development System Admin',
        username,
        email,
        role: 'System Admin',
        division: 'Development',
        status: 'active'
      })
      .onConflictDoUpdate({
        target: personnel.username,
        set: {
          userId: user.id,
          name: 'Development System Admin',
          email,
          role: 'System Admin',
          division: 'Development',
          status: 'active'
        }
      });

    console.log(`Development test account seeded successfully: ${email}`);
  } catch (err) {
    console.error('Error during development seeding:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDev();
