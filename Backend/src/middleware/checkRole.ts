import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../types/auth';

export function checkRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.authContext?.role;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Role not allowed.' } });
      return;
    }

    next();
  };
}
