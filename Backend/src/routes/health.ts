// Health check endpoint

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /v1/health
 * Always public - no auth required
 */
router.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
