// Collaboration routes
import { Router } from 'express';
import { z } from 'zod';
import { collaborationService } from '../services/CollaborationService';
import { verifyToken, loadAuthContext } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types/auth';
import { supabase } from '../config/supabase';

const router = Router();

// All collaboration endpoints require authentication
router.use(verifyToken, loadAuthContext);

/**
 * Send invite schema
 * API contract uses snake_case
 */
const SendInviteSchema = z.object({
  campaign_id: z.string().uuid(),
  influencer_id: z.string().uuid(),
  message: z.string().max(500).optional(),
});

/**
 * Apply to campaign schema
 * API contract uses snake_case
 */
const ApplyToCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
  message: z.string().max(500).optional(),
});

/**
 * Update status schema
 */
const UpdateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

/**
 * POST /v1/collaborations/invite
 * Brand sends collaboration invite to influencer
 */
router.post('/invite', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check role is BRAND
    if (req.auth!.role !== 'BRAND') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only brands can send invites' },
      });
    }

    const validated = SendInviteSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Map snake_case to camelCase for service layer
    const data = {
      campaignId: validated.campaign_id,
      influencerId: validated.influencer_id,
      message: validated.message,
      idempotencyKey,
    };

    const collaboration = await collaborationService.sendInvite(req.auth!, data);

    res.status(201).json(collaboration);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/collaborations/apply
 * Influencer applies to campaign
 */
router.post('/apply', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check role is INFLUENCER
    if (req.auth!.role !== 'INFLUENCER') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only influencers can apply to campaigns' },
      });
    }

    // Get influencer profile ID
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', req.auth!.userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Influencer profile not found' },
      });
    }

    const validated = ApplyToCampaignSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Map snake_case to camelCase for service layer
    const data = {
      campaignId: validated.campaign_id,
      message: validated.message,
      idempotencyKey,
    };

    const collaboration = await collaborationService.apply(
      req.auth!,
      profile.id,
      data
    );

    res.status(201).json(collaboration);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /v1/collaborations/:id/status
 * Accept or decline collaboration request
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = UpdateStatusSchema.parse(req.body);
    const collaboration = await collaborationService.updateStatus(
      req.auth!,
      req.params.id,
      status
    );

    res.json(collaboration);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/collaborations/incoming
 * Get incoming collaboration requests for influencer
 */
router.get('/incoming', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check role is INFLUENCER
    if (req.auth!.role !== 'INFLUENCER') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only influencers can view incoming collaborations' },
      });
    }

    // Get influencer profile ID
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', req.auth!.userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Influencer profile not found' },
      });
    }

    const collaborations = await collaborationService.getIncoming(profile.id);

    res.json({ data: collaborations });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/collaborations/campaign/:campaignId
 * List all collaborations for a campaign
 * Brand-only endpoint
 */
router.get('/campaign/:campaignId', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Check role is BRAND
    if (req.auth!.role !== 'BRAND') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only brands can view campaign collaborations' },
      });
    }

    const collaborations = await collaborationService.listForCampaign(
      req.auth!,
      req.params.campaignId
    );

    res.json({ data: collaborations });
  } catch (error) {
    next(error);
  }
});

export default router;
