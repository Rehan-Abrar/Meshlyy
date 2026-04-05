// Creator discovery and detail routes
import { Router } from 'express';
import { z } from 'zod';
import { creatorService } from '../services/CreatorService';
import { verifyToken, loadAuthContext, checkRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Apply auth middleware - all creator endpoints require BRAND role
router.use(verifyToken, loadAuthContext, checkRole('BRAND'));

/**
 * Discovery filters schema
 */
const DiscoveryFiltersSchema = z.object({
  niche: z.string().optional(),
  follower_min: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  follower_max: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  engagement_min: z.string().transform(Number).pipe(z.number().min(0).max(100)).optional(),
  country: z.string().optional(),
  is_verified: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
});

/**
 * GET /v1/creators
 * Discovery search with filters and pagination
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const filters = DiscoveryFiltersSchema.parse(req.query);
    const result = await creatorService.discover(filters);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/creators/:id
 * Get creator detail with full profile, stats, and rate cards
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const creatorId = req.params.id;
    const creator = await creatorService.getDetail(creatorId);
    
    res.json(creator);
  } catch (error) {
    next(error);
  }
});

export default router;
