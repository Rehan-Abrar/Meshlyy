// Instagram profile verification and ingest orchestration
import { supabase } from '../config/supabase';
import { apifyService, IngestFailureClass, type InstagramProfileData } from './ApifyService';
import { lockStore } from '../stores';
import { logger } from '../middleware/logging';
import { Errors } from '../lib/errors';

export interface IngestJobResult {
  success: boolean;
  influencerId: string;
  jobId: string;
  verificationStatus?: 'APPROVED' | 'FLAGGED' | 'PENDING';
}

/**
 * Auto-approval rules
 * Account is auto-approved if:
 * - Follower count >= 10,000
 * - Engagement rate >= 2.0% and <= 15.0% (suspicious if too high)
 * - No suspicious signals detected
 */
const AUTO_APPROVAL_RULES = {
  MIN_FOLLOWERS: 10000,
  MIN_ENGAGEMENT: 2.0,
  MAX_ENGAGEMENT: 15.0,
};

/**
 * Auto-flagging rules
 */
const AUTO_FLAG_RULES = {
  // Engagement rate anomaly
  SUSPICIOUS_ENGAGEMENT_HIGH: 15.0,
  SUSPICIOUS_ENGAGEMENT_LOW: 0.5,
  
  // Follower/following ratio (potential bot)
  MAX_FOLLOWING_RATIO: 2.0, // following > 2x followers
};

export class IngestService {
  /**
   * Trigger verification ingest for an influencer profile
   * Returns job ID for tracking
   */
  async triggerIngest(influencerId: string, igHandle: string): Promise<string> {
    // Acquire lock to prevent concurrent ingest for same handle
    const lockKey = `ingest:${igHandle}`;
    const acquired = await lockStore.acquire(lockKey, 300); // 5 min timeout

    if (!acquired) {
      throw Errors.CONFLICT('Another ingest job is already running for this handle');
    }

    try {
      // Create ingest job record
      const { data: job, error: jobError } = await supabase
        .from('ingest_jobs')
        .insert({
          influencer_id: influencerId,
          ig_handle: igHandle,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (jobError || !job) {
        const detail = jobError
          ? `${jobError.message}${jobError.details ? ` | ${jobError.details}` : ''}${jobError.hint ? ` | ${jobError.hint}` : ''}`
          : 'ingest job insert returned no row';
        logger.error(`[Ingest] Failed to create ingest job for ${igHandle}: ${detail}`);
        throw Errors.DATABASE_ERROR(detail);
      }

      // Run ingest asynchronously (don't await)
      this.runIngestPipeline(influencerId, igHandle, job.id).catch((err) => {
        logger.error(`[Ingest] Pipeline failed for ${igHandle}:`, err);
      });

      return job.id;
    } finally {
      // Release lock after starting job (job will run independently)
      await lockStore.release(lockKey);
    }
  }

  /**
   * Full ingest pipeline: fetch → parse → store → flag/approve
   */
  private async runIngestPipeline(
    influencerId: string,
    igHandle: string,
    jobId: string
  ): Promise<void> {
    try {
      logger.info(`[Ingest] Starting pipeline for ${igHandle}`);

      // Step 1: Fetch data from Apify
      const result = await apifyService.fetchProfileData(igHandle);

      if (!result.success) {
        await this.handleIngestFailure(jobId, influencerId, result.failureClass!, result.failureDetail!);
        return;
      }

      const profileData = result.data!;

      // Step 2: Store stats
      await this.storeStats(influencerId, profileData);

      // Step 3: Run approval/flagging rules
      const decision = this.evaluateProfile(profileData);

      // Step 4: Update profile verification status
      await this.updateVerificationStatus(influencerId, decision);

      // Step 5: Mark job as success
      await supabase
        .from('ingest_jobs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          error_code: null,
        })
        .eq('id', jobId);

      // Step 6: Update profile last_scraped_at
      await supabase
        .from('influencer_profiles')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', influencerId);

      logger.info(`[Ingest] Pipeline completed for ${igHandle} - ${decision.status}`);
    } catch (error: any) {
      logger.error(`[Ingest] Pipeline error for ${igHandle}:`, error);
      await this.handleIngestFailure(jobId, influencerId, IngestFailureClass.UNKNOWN, error.message);
    }
  }

  /**
   * Store Instagram stats in database
   */
  private async storeStats(influencerId: string, data: InstagramProfileData): Promise<void> {
    // Upsert stats (insert or update if exists)
    const { error } = await supabase
      .from('influencer_stats')
      .upsert({
        influencer_id: influencerId,
        follower_count: data.followerCount,
        following_count: data.followingCount,
        engagement_rate: data.engagementRate,
        avg_likes: data.avgLikes,
        avg_comments: data.avgComments,
        top_countries: data.topCountries,
        age_split: data.ageSplit,
        gender_split: data.genderSplit,
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'influencer_id'
      });

    if (error) {
      throw new Error(`Failed to store stats: ${error.message}`);
    }
  }

  /**
   * Evaluate profile for auto-approval or auto-flagging
   */
  private evaluateProfile(data: InstagramProfileData): {
    status: 'APPROVED' | 'FLAGGED' | 'PENDING';
    flags?: Array<{ type: string; detail: string }>;
  } {
    const flags: Array<{ type: string; detail: string }> = [];

    // Check engagement rate anomaly
    if (data.engagementRate > AUTO_FLAG_RULES.SUSPICIOUS_ENGAGEMENT_HIGH) {
      flags.push({
        type: 'SUSPICIOUS_METRICS',
        detail: `Engagement rate ${data.engagementRate.toFixed(2)}% is unusually high (>15%)`,
      });
    }

    if (data.engagementRate < AUTO_FLAG_RULES.SUSPICIOUS_ENGAGEMENT_LOW) {
      flags.push({
        type: 'SUSPICIOUS_METRICS',
        detail: `Engagement rate ${data.engagementRate.toFixed(2)}% is unusually low (<0.5%)`,
      });
    }

    // Check follower/following ratio (potential bot)
    const followRatio = data.followingCount / Math.max(data.followerCount, 1);
    if (followRatio > AUTO_FLAG_RULES.MAX_FOLLOWING_RATIO) {
      flags.push({
        type: 'SUSPICIOUS_METRICS',
        detail: `Following ${data.followingCount} is much higher than followers ${data.followerCount}`,
      });
    }

    // If flagged, return flagged status
    if (flags.length > 0) {
      return { status: 'FLAGGED', flags };
    }

    // Auto-approve if meets criteria
    if (
      data.followerCount >= AUTO_APPROVAL_RULES.MIN_FOLLOWERS &&
      data.engagementRate >= AUTO_APPROVAL_RULES.MIN_ENGAGEMENT &&
      data.engagementRate <= AUTO_APPROVAL_RULES.MAX_ENGAGEMENT
    ) {
      return { status: 'APPROVED' };
    }

    // Otherwise, pending manual review
    return { status: 'PENDING' };
  }

  /**
   * Update influencer profile verification status
   */
  private async updateVerificationStatus(
    influencerId: string,
    decision: { status: 'APPROVED' | 'FLAGGED' | 'PENDING'; flags?: any[] }
  ): Promise<void> {
    // Update profile
    await supabase
      .from('influencer_profiles')
      .update({
        verification_status: decision.status,
        is_verified: decision.status === 'APPROVED',
      })
      .eq('id', influencerId);

    // Create admin flags if flagged
    if (decision.status === 'FLAGGED' && decision.flags) {
      const flagInserts = decision.flags.map((flag) => ({
        influencer_id: influencerId,
        flag_type: flag.type,
        flag_detail: { reason: flag.detail },
        resolved: false,
      }));

      await supabase.from('admin_flags').insert(flagInserts);
    }
  }

  /**
   * Handle ingest failure
   */
  private async handleIngestFailure(
    jobId: string,
    influencerId: string,
    failureClass: string,
    failureDetail: string
  ): Promise<void> {
    logger.error(`[Ingest] Job ${jobId} failed: ${failureClass} - ${failureDetail}`);

    // Update job status
    await supabase
      .from('ingest_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_code: failureClass,
      })
      .eq('id', jobId);

    // Update profile verification status based on failure type
    if (failureClass === IngestFailureClass.INVALID_HANDLE || failureClass === IngestFailureClass.PRIVATE_ACCOUNT) {
      // Reject profile for invalid/private accounts
      await supabase
        .from('influencer_profiles')
        .update({
          verification_status: 'REJECTED',
          is_verified: false,
        })
        .eq('id', influencerId);
    }
    // For other failures (rate limit, timeout, etc.), keep status as PENDING for retry
  }

  /**
   * Get ingest job status
   */
  async getJobStatus(jobId: string) {
    const { data, error } = await supabase
      .from('ingest_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Ingest job not found');
    }

    return data;
  }
}

export const ingestService = new IngestService();
