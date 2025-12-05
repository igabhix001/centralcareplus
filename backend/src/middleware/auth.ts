import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../lib/jwt.js';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = payload;
  next();
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
}

export function authorizeAdmin(req: Request, res: Response, next: NextFunction) {
  return authorize('SUPERADMIN', 'STAFF')(req, res, next);
}

export function authorizeDoctor(req: Request, res: Response, next: NextFunction) {
  return authorize('DOCTOR')(req, res, next);
}

export function authorizePatient(req: Request, res: Response, next: NextFunction) {
  return authorize('PATIENT')(req, res, next);
}

// Alias for requireRole
export const requireRole = authorize;
