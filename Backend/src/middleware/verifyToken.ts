import type { NextFunction, Request, Response } from 'express';
import type { TokenPayload } from '../types/auth';

function parseBearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = parseBearerToken(req.header('authorization'));
  if (!token) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Missing bearer token.' } });
    return;
  }

  // TODO: Replace with Supabase JWKS verification.
  const payload = { sub: 'todo-user-id', role: 'BRAND' } as TokenPayload;
  req.tokenPayload = payload;
  next();
}
