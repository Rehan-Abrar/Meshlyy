import type { NextFunction, Request, Response } from 'express';
import type { BudgetStore } from '../stores/interfaces';

export function budgetMiddleware(store: BudgetStore, cap: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const brandId = req.authContext?.brandId ?? req.authContext?.userId;
    if (!brandId) {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Missing auth context.' } });
      return;
    }

    const key = `ai:brand:${brandId}`;
    const spend = await store.getSpend(key);

    if (spend >= cap) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        error: { code: 'BUDGET_EXCEEDED', message: 'Daily AI budget reached.' }
      });
      return;
    }

    next();
  };
}
