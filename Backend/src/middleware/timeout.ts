// Global request timeout middleware

import { Request, Response, NextFunction } from 'express';
import timeout from 'connect-timeout';
import config from '../config/env';
import { sendError } from '../lib/errors';

export function timeoutMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // AI routes need longer timeout to complete LLM calls.
    const isAiRoute = req.path.startsWith('/v1/ai/');
    const aiTimeoutMs = Math.max(config.GEMINI_TIMEOUT_MS + 5000, config.REQUEST_TIMEOUT_MS);
    const requestTimeoutMs = isAiRoute ? aiTimeoutMs : config.REQUEST_TIMEOUT_MS;

    return timeout(requestTimeoutMs)(req, res, next);
  };
}

export function haltOnTimeout(req: Request, res: Response, next: NextFunction) {
  if (!req.timedout) {
    next();
  } else {
    sendError(res, 503, 'REQUEST_TIMEOUT', 'Request exceeded timeout limit');
  }
}
