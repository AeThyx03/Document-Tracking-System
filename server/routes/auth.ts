import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { users, personnel } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';
import { getJwtSecret } from '../config/jwt.ts';

export const authRouter = Router();

const isProduction = process.env.NODE_ENV === 'production';
const authMode = process.env.AUTH_MODE || (isProduction ? 'postgres' : 'development');

interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  password_hash?: string | null;
  role: string;
  status: boolean;
  division: string | null;
  assigned_desk: string | null;
}

async function postgresGetUserByEmailOrUsername(emailOrUsername: string): Promise<AuthUser | null> {
  const user = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      full_name: personnel.name,
      password_hash: users.passwordHash,
      role: users.role,
      status: users.isActive,
      division: personnel.division,
      assigned_desk: personnel.assignedDesk
    })
    .from(users)
    .leftJoin(personnel, eq(users.id, personnel.userId))
    .where(
      or(
        eq(users.email, emailOrUsername),
        eq(users.username, emailOrUsername)
      )
    )
    .limit(1);

  if (user.length === 0) return null;
  return {
    ...user[0],
    id: String(user[0].id)
  };
}

async function postgresGetUserById(id: string): Promise<AuthUser | null> {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const user = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      full_name: personnel.name,
      role: users.role,
      status: users.isActive,
      division: personnel.division,
      assigned_desk: personnel.assignedDesk
    })
    .from(users)
    .leftJoin(personnel, eq(users.id, personnel.userId))
    .where(eq(users.id, numericId))
    .limit(1);

  if (user.length === 0) return null;
  return {
    ...user[0],
    id: String(user[0].id)
  };
}

authRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body; 
    
    if (!email || !password) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    const normalizedIdentifier = String(email).trim().toLowerCase();
    if (isProduction && (normalizedIdentifier === 'dev_admin' || normalizedIdentifier === 'dev-admin@localhost.test')) {
      return res.status(403).json({ success: false, error: 'DEV_ACCOUNT_DISABLED', message: 'Development accounts are disabled in production.' });
    }

    if (authMode !== 'development' && authMode !== 'postgres') {
      return res.status(500).json({ success: false, error: 'INVALID_AUTH_MODE', message: 'Authentication mode is misconfigured.' });
    }

    let user: AuthUser | null = await postgresGetUserByEmailOrUsername(email);
    
    if (!user || !user.status) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    if (!user.password_hash) {
       return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name || user.username,
        username: user.username,
        division: user.division,
      },
      secret,
      { expiresIn: '12h' }
    );

    const profile = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.full_name || user.username,
      role: user.role,
      division: user.division,
      assignedDesk: user.assigned_desk,
      status: user.status ? 'active' : 'suspended'
    };

    res.json({
      success: true,
      token,
      user: profile
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'An internal error occurred.' });
  }
});

authRouter.post('/auth/logout', requireAuth, (req, res) => {
  res.json({ success: true });
});

authRouter.post('/auth/refresh', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Refresh placeholder' });
});

authRouter.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.id) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const user = await postgresGetUserById(userPayload.id);

    if (!user || !user.status) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found or inactive.' });
    }

    const profile = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.full_name || user.username,
      role: user.role,
      division: user.division,
      assignedDesk: user.assigned_desk,
      status: user.status ? 'active' : 'suspended'
    };

    res.json({ success: true, user: profile });
  } catch (e) {
    console.error('Fetch me error', e);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});
