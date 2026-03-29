import type { AuthContext, TokenPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      tokenPayload?: TokenPayload;
      authContext?: AuthContext;
    }
  }
}

export {};
