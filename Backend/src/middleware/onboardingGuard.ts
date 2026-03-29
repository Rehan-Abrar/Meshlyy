import type { NextFunction, Request, Response } from 'express';

export function onboardingGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.authContext?.onboardingCompleted === false) {
    res.status(403).json({
      error: {
        code: 'ONBOARDING_INCOMPLETE',
        message: 'Complete onboarding to continue.'
      }
    });
    return;
  }

  next();
}
