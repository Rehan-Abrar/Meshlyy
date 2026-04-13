import { Router } from 'express';
import { checkRole } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

router.use(checkRole('INFLUENCER'));

/**
 * GET /v1/influencer/dashboard
 * Returns summary KPIs for influencer dashboard cards.
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', req.auth!.userId)
      .eq('is_deleted', false)
      .single();

    if (profileError || !profile) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    const [initialStatsRes, collaborationsRes] = await Promise.all([
      supabase
        .from('influencer_stats')
        .select('follower_count, avg_likes, engagement_rate, total_views_30d')
        .eq('influencer_id', profile.id)
        .order('last_updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('collaboration_requests')
        .select('status, type')
        .eq('influencer_id', profile.id),
    ]);

    let statsRes = initialStatsRes;

    // Backward compatibility during rollout before migration 0003 is applied.
    if (statsRes.error && /total_views_30d/i.test(statsRes.error.message || '')) {
      statsRes = await supabase
        .from('influencer_stats')
        .select('follower_count, avg_likes, engagement_rate')
        .eq('influencer_id', profile.id)
        .order('last_updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
    }

    if (statsRes.error) {
      throw Errors.DATABASE_ERROR(statsRes.error.message);
    }

    if (collaborationsRes.error) {
      throw Errors.DATABASE_ERROR(collaborationsRes.error.message);
    }

    const rows = collaborationsRes.data || [];
    const pendingInvites = rows.filter((row) => row.type === 'INVITE' && row.status === 'PENDING').length;
    const acceptedCollaborations = rows.filter((row) => row.status === 'ACCEPTED').length;

    res.json({
      data: {
        followerCount: Number(statsRes.data?.follower_count || 0),
        avgLikes: Number(statsRes.data?.avg_likes || 0),
        totalViews30d: statsRes.data?.total_views_30d ?? null,
        engagementRate: Number(statsRes.data?.engagement_rate || 0),
        pendingInvites,
        acceptedCollaborations,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
