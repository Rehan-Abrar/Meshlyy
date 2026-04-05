// Campaign routes
import { Router } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/CampaignService';
import { verifyToken, loadAuthContext, checkRole } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Apply auth middleware - all campaign endpoints require BRAND role
router.use(verifyToken, loadAuthContext, checkRole('BRAND'));

/**
 * Create campaign schema
 */
const CreateCampaignSchema = z.object({
  title: z.string().min(1).max(200),
  briefPreview: z.string().max(280).optional(),
  briefData: z.record(z.any()).optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  nicheTargets: z.array(z.string()).optional(),
  visibility: z.enum(['MATCHED', 'PUBLIC']).default('MATCHED'),
});

/**
 * Update campaign schema
 */
const UpdateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  briefPreview: z.string().max(280).optional(),
  briefData: z.record(z.any()).optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  nicheTargets: z.array(z.string()).optional(),
  visibility: z.enum(['MATCHED', 'PUBLIC']).optional(),
});

/**
 * Update status schema
 */
const UpdateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']),
});

/**
 * POST /v1/campaigns
 * Create a new campaign
 */
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = CreateCampaignSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    
    const campaign = await campaignService.create(req.auth!, {
      ...data,
      idempotencyKey,
    });
    
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/campaigns
 * List all campaigns for the authenticated brand
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    
    const result = await campaignService.list(req.auth!, { status, page, limit });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const campaign = await campaignService.getById(req.auth!, req.params.id);
    
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /v1/campaigns/:id
 * Update campaign
 */
router.patch('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = UpdateCampaignSchema.parse(req.body);
    const campaign = await campaignService.update(req.auth!, req.params.id, data);
    
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /v1/campaigns/:id/status
 * Update campaign status
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = UpdateStatusSchema.parse(req.body);
    const campaign = await campaignService.updateStatus(req.auth!, req.params.id, status);
    
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/campaigns/:id
 * Soft delete campaign
 */
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    await campaignService.delete(req.auth!, req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/campaigns/matched
 * Get matched campaigns for authenticated influencer
 * This is a separate endpoint specifically for influencers
 */
export const matchedCampaignsRouter = Router();
matchedCampaignsRouter.use(verifyToken, loadAuthContext, checkRole('INFLUENCER'));

matchedCampaignsRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Get influencer profile ID from user
    const { data: profile } = await require('../config/supabase').supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', req.auth!.userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Influencer profile not found',
        },
      });
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    
    const result = await campaignService.getMatchedForInfluencer(profile.id, page, limit);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
