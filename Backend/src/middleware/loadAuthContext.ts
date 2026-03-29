import type { NextFunction, Request, Response } from 'express';

export async function loadAuthContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.tokenPayload?.sub || !req.tokenPayload.role) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token payload missing required claims.' } });
    return;
  }

  // TODO: Load users + brand_profiles from DB and populate real values.
  req.authContext = {
    userId: req.tokenPayload.sub,
    role: req.tokenPayload.role,
    onboardingCompleted: true
  };

  next();
}
