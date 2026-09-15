import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendApiError } from './errorHandler.ts';
import { getJwtSecret } from '../config/jwt.ts';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Enforces valid backend JWT bearer token.
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendApiError(res, 401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return sendApiError(res, 401, 'UNAUTHORIZED', 'Token not provided');
  }

  try {
    const secret = getJwtSecret();
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return sendApiError(res, 401, 'INVALID_TOKEN', 'Unauthorized: Invalid or expired token');
      }
      req.user = decoded;
      next();
    });
  } catch (configErr) {
    console.error('Authentication configuration error during token verification:', configErr);
    return sendApiError(res, 500, 'SERVER_ERROR', 'Authentication service is misconfigured.');
  }
};
