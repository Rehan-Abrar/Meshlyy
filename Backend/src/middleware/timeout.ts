import type { NextFunction, Request, Response } from 'express';

export function requestTimeout(timeoutMs = 5000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(503).json({ error: { code: 'REQUEST_TIMEOUT', message: 'Request timed out.' } });
      }
    });
    next();
  };
}
