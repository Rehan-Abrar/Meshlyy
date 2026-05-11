import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { logger } from '../middleware/logging';

const router = Router();

// Rate limit: 5 waitlist submissions per IP per 15 minutes
const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many submissions. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const WaitlistSchema = z.object({
  email: z.string().email('Please provide a valid email address').max(255),
  role: z.enum(['brand', 'influencer']).optional(),
});

/**
 * POST /v1/waitlist
 * Public endpoint — no auth required.
 * Stores email for waitlist / early access.
 */
router.post('/', waitlistLimiter, async (req, res, next) => {
  try {
    const { email, role } = WaitlistSchema.parse(req.body);

    // Upsert: if email already exists, just update the timestamp
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          role_preference: role || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

    if (error) {
      // If table doesn't exist yet, log but still return success to user
      logger.warn('Waitlist insert failed (table may not exist yet)', { error: error.message });
      
      // Fallback: just log the email so it's not lost
      logger.info('Waitlist signup (fallback)', { email: email.toLowerCase().trim(), role: role || 'none' });
    }

    res.status(201).json({
      success: true,
      message: "You're on the list! We'll be in touch soon.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
