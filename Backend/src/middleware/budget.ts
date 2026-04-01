// Budget middleware for AI and ingest endpoints

import { Request, Response, NextFunction } from 'express';
import { budgetStore } from '../stores';
import { sendError } from '../lib/errors';
import config from '../config/env';

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Budget middleware for AI endpoints
 * Checks daily AI token spend via BudgetStore
 * Returns 429 with Retry-After header if cap reached
 */
export async function aiBudgetMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.authContext?.brandId) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Authentication required');
    }
    
    const budgetKey = `ai:brand:${req.authContext.brandId}`;
    const spend = await budgetStore.getSpend(budgetKey);
    
    if (spend >= config.DAILY_AI_TOKEN_CAP) {
      const retryAfter = secondsUntilMidnightUTC();
      return res.status(429)
        .set('Retry-After', retryAfter.toString())
        .json({
          error: {
            code: 'BUDGET_EXCEEDED',
            message: 'Daily AI budget reached'
          }
        });
    }
    
    next();
  } catch (error) {
    return sendError(res, 500, 'INTERNAL_ERROR', 'Budget check failed');
  }
}

/**
 * Budget middleware for Apify ingest endpoints
 * Checks daily Apify spend via BudgetStore
 * Returns 429 with Retry-After header if cap reached
 */
export async function apifyBudgetMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const budgetKey = 'apify:daily';
    const spend = await budgetStore.getSpend(budgetKey);
    
    if (spend >= config.DAILY_APIFY_SPEND_CAP) {
      const retryAfter = secondsUntilMidnightUTC();
      return res.status(429)
        .set('Retry-After', retryAfter.toString())
        .json({
          error: {
            code: 'BUDGET_EXCEEDED',
            message: 'Daily Apify budget reached'
          }
        });
    }
    
    next();
  } catch (error) {
    return sendError(res, 500, 'INTERNAL_ERROR', 'Budget check failed');
  }
}
