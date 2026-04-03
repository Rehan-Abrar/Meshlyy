// Onboarding routes
import { Router } from 'express';
import { z } from 'zod';
import { brandService } from '../services/BrandService';
import { influencerService } from '../services/InfluencerService';
import { ingestService } from '../services/IngestService';
import { verifyToken, loadAuthContext, checkRole } from '../middleware/auth';
import { Errors } from '../lib/errors';
import { logger } from '../middleware/logging';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Apply auth middleware to all onboarding routes
router.use(verifyToken, loadAuthContext);

/**
 * Brand onboarding schema
 */
const BrandOnboardingSchema = z.object({
  companyName: z.string().min(1).max(200),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  targetDemographics: z.record(z.any()).optional(),
  budgetRangeMin: z.number().min(0).optional(),
  budgetRangeMax: z.number().min(0).optional(),
  toneVoice: z.string().max(500).optional(),
  campaignGoals: z.array(z.string()).optional(),
});

/**
 * POST /v1/onboarding/brand
 * Complete brand onboarding (single-step)
 */
router.post('/brand', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = BrandOnboardingSchema.parse(req.body);
    const result = await brandService.completeOnboarding(req.auth!.userId, data);
    
    res.status(201).json({
      success: true,
      brandId: result.brandId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Influencer onboarding schemas
 */
const InfluencerStep1Schema = z.object({
  igHandle: z.string().min(1).max(30),
});

const InfluencerStep2Schema = z.object({
  nichePrimary: z.string().min(1).max(50),
  nicheSecondary: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
});

const InfluencerStep3Schema = z.object({
  portfolioUrl: z.string().url().optional(),
  mediaKitUrl: z.string().url().optional(),
});

const RateCardSchema = z.object({
  serviceType: z.enum(['STORY', 'POST', 'REEL', 'BUNDLE']),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
});

const InfluencerStep4Schema = z.object({
  rateCards: z.array(RateCardSchema).min(1),
});

/**
 * POST /v1/onboarding/influencer/step1
 * Step 1: Instagram handle validation
 */
router.post('/influencer/step1', checkRole('INFLUENCER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = InfluencerStep1Schema.parse(req.body);
    const result = await influencerService.submitStep1(req.auth!.userId, data);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/onboarding/influencer/step2
 * Step 2: Niche and bio
 */
router.post('/influencer/step2', checkRole('INFLUENCER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = InfluencerStep2Schema.parse(req.body);
    const result = await influencerService.submitStep2(req.auth!.userId, data);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/onboarding/influencer/step3
 * Step 3: Portfolio and media kit
 */
router.post('/influencer/step3', checkRole('INFLUENCER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = InfluencerStep3Schema.parse(req.body);
    const result = await influencerService.submitStep3(req.auth!.userId, data);
    
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('[Onboarding][Step3] Failed to save portfolio/media kit', {
        userId: req.auth?.userId,
        message: error.message,
        stack: error.stack,
      });
    }
    next(error);
  }
});

/**
 * POST /v1/onboarding/influencer/step4
 * Step 4: Rate cards and complete onboarding
 * Triggers verification ingest job
 */
router.post('/influencer/step4', checkRole('INFLUENCER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = InfluencerStep4Schema.parse(req.body);
    await influencerService.submitStep4(req.auth!.userId, data);

    const completionResult = await influencerService.completeOnboarding(req.auth!.userId);
    
    // Trigger ingest job
    const jobId = await ingestService.triggerIngest(completionResult.profileId, completionResult.igHandle);
    
    res.status(201).json({
      success: true,
      jobId,
      message: 'Onboarding complete. Profile verification in progress.',
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('[Onboarding][Step4] Failed to complete onboarding or trigger ingest', {
        userId: req.auth?.userId,
        message: error.message,
        stack: error.stack,
      });
    }
    next(error);
  }
});

/**
 * GET /v1/onboarding/status
 * Get current user's onboarding status
 */
router.get('/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId, role, onboardingCompleted } = req.auth!;
    
    res.json({
      userId,
      role,
      onboardingCompleted,
      currentStep: req.auth!.onboardingStep || 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
