import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import firebaseConfig from '../../firebase-applet-config.json';
import { sendApiError } from './errorHandler.ts';

const jwks = jwksClient({
  jwksUri: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      return callback(err || new Error('Key not found'));
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Enforces valid Firebase JWT bearer token.
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

  jwt.verify(
    token,
    getKey,
    {
      audience: firebaseConfig.projectId,
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        return sendApiError(res, 401, 'INVALID_TOKEN', 'Unauthorized: Invalid or expired token');
      }
      req.user = decoded;
      next();
    }
  );
};

/**
 * Optional authentication: decodes user token if provided, but does not block requests.
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(
    token,
    getKey,
    {
      audience: firebaseConfig.projectId,
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    }
  );
};
