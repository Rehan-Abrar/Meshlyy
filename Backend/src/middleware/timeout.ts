// Global request timeout middleware

import { Request, Response, NextFunction } from 'express';
import timeout from 'connect-timeout';
import config from '../config/env';
import { sendError } from '../lib/errors';

export function timeoutMiddleware() {
  return timeout(config.REQUEST_TIMEOUT_MS);
}

export function haltOnTimeout(req: Request, res: Response, next: NextFunction) {
  if (!req.timedout) {
    next();
  } else {
    sendError(res, 503, 'REQUEST_TIMEOUT', 'Request exceeded timeout limit');
  }
}
