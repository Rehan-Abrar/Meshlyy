import type { NextFunction, Request, Response } from 'express';

// MVP: pass-through stub. Keep this middleware in the chain for post-MVP wiring.
export function subscriptionGuard(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
