// Global error handler middleware

import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../lib/errors';
import { logger } from './logging';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.authContext?.userId
  });
  
  // Handle known AppError instances
  if (err instanceof AppError) {
    const retryAfter = (err as any).retryAfter;
    const response = res.status(err.statusCode);
    
    if (retryAfter) {
      response.set('Retry-After', retryAfter.toString());
    }
    
    return response.json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.field && { field: err.field })
      }
    });
  }
  
  // Handle unknown errors
  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
