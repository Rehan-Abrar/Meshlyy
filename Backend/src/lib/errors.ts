// Standardized error response utilities

import { Response } from 'express';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(res: Response, statusCode: number, code: string, message: string, field?: string): Response {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      ...(field && { field })
    }
  };
  return res.status(statusCode).json(errorResponse);
}

// Predefined error factories
export const Errors = {
  // 400 Validation
  VALIDATION_ERROR: (message: string, field?: string) => 
    new AppError(400, 'VALIDATION_ERROR', message, field),

  // 500 Internal
  INTERNAL_ERROR: (message: string = 'An unexpected error occurred') =>
    new AppError(500, 'INTERNAL_ERROR', message),

  // 500 Internal
  DATABASE_ERROR: (detail?: string) =>
    new AppError(500, 'DATABASE_ERROR', detail ? `Database operation failed: ${detail}` : 'Database operation failed'),
  
  // 401 Authentication
  INVALID_TOKEN: () => 
    new AppError(401, 'INVALID_TOKEN', 'JWT missing, expired, or invalid'),
  USER_NOT_FOUND: () => 
    new AppError(401, 'USER_NOT_FOUND', 'User not found in database'),
  
  // 403 Authorization
  FORBIDDEN: (message: string = 'You do not have permission to access this resource') => 
    new AppError(403, 'FORBIDDEN', message),
  SUBSCRIPTION_REQUIRED: () => 
    new AppError(403, 'SUBSCRIPTION_REQUIRED', 'Subscription tier insufficient for this feature'),
  ONBOARDING_INCOMPLETE: (redirectStep: number) => 
    new AppError(403, 'ONBOARDING_INCOMPLETE', `Please complete onboarding. Redirect to step ${redirectStep}`),
  RESUBMISSION_LIMIT: () =>
    new AppError(403, 'RESUBMISSION_LIMIT', 'Maximum resubmission count reached. Please contact support.'),
  
  // 404 Not Found
  NOT_FOUND: (resource: string) => 
    new AppError(404, 'NOT_FOUND', `${resource} not found`),
  
  // 409 Conflict
  CONFLICT: (message: string) =>
    new AppError(409, 'CONFLICT', message),
  HANDLE_DUPLICATE: () => 
    new AppError(409, 'HANDLE_DUPLICATE', 'Instagram handle already registered to another active user'),
  INGEST_IN_PROGRESS: () => 
    new AppError(409, 'INGEST_IN_PROGRESS', 'Ingest already running for this handle'),
  IDEMPOTENCY_KEY_REUSED: () =>
    new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key reused with different payload'),
  
  // 422 Unprocessable
  HANDLE_NOT_FOUND: () => 
    new AppError(422, 'HANDLE_NOT_FOUND', 'Instagram handle does not exist or is not a Business/Creator account'),
  HANDLE_PRIVATE: () => 
    new AppError(422, 'HANDLE_PRIVATE', 'Instagram account is private'),
  
  // 429 Rate Limiting
  BUDGET_EXCEEDED: (retryAfterSeconds: number) => {
    const error = new AppError(429, 'BUDGET_EXCEEDED', 'Daily budget cap reached');
    (error as any).retryAfter = retryAfterSeconds;
    return error;
  },
  RESUBMISSION_COOLDOWN: (retryAfterSeconds: number) => {
    const error = new AppError(429, 'RESUBMISSION_COOLDOWN', 'Resubmission attempted within 24h window');
    (error as any).retryAfter = retryAfterSeconds;
    return error;
  },
  
  // 503 Service Unavailable
  REQUEST_TIMEOUT: () => 
    new AppError(503, 'REQUEST_TIMEOUT', 'Request exceeded timeout limit'),
  AI_UNAVAILABLE: () => 
    new AppError(503, 'AI_UNAVAILABLE', 'AI service temporarily unavailable'),
  AUTH_CONTEXT_UNAVAILABLE: () =>
    new AppError(503, 'AUTH_CONTEXT_UNAVAILABLE', 'Authentication context unavailable'),
};
