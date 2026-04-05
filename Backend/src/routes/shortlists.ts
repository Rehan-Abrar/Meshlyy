// Shortlist routes
import { Router } from 'express';
import { z } from 'zod';
import { shortlistService } from '../services/ShortlistService';
import { verifyToken, loadAuthContext, checkRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Apply auth middleware - all shortlist endpoints require BRAND role
router.use(verifyToken, loadAuthContext, checkRole('BRAND'));

/**
 * Add to shortlist schema
 * API contract uses snake_case
 */
const AddToShortlistSchema = z.object({
  influencer_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  label: z.string().max(100).optional(),
});

/**
 * POST /v1/shortlists
 * Add influencer to shortlist
 */
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = AddToShortlistSchema.parse(req.body);
    // Map snake_case to camelCase for service layer
    const data = {
      influencerId: validated.influencer_id,
      campaignId: validated.campaign_id,
      label: validated.label,
    };
    const shortlist = await shortlistService.add(req.auth!, data);
    
    res.status(201).json(shortlist);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/shortlists
 * List shortlisted influencers
 * Optional query param: campaignId
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const campaignId = req.query.campaignId as string | undefined;
    const shortlists = await shortlistService.list(req.auth!, campaignId);
    
    res.json({ data: shortlists });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/shortlists/:id
 * Remove influencer from shortlist
 */
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    await shortlistService.remove(req.auth!, req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
