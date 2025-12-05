import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@prisma/client';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me');

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
