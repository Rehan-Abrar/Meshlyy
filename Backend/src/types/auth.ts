import type { Request } from 'express';
import type { AuthContext as BaseAuthContext, UserRole } from './index';

export type { UserRole };

export type AuthContext = BaseAuthContext;

export interface TokenPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  authContext?: AuthContext;
}
