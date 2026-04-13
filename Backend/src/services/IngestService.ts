// Instagram profile verification and ingest orchestration
import { supabase } from '../config/supabase';
import { apifyService, IngestFailureClass, type InstagramProfileData } from './ApifyService';
import { lockStore } from '../stores';
import { logger } from '../middleware/logging';
import { Errors } from '../lib/errors';
import config from '../config/env';

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

const TRANSIENT_FAILURE_CLASSES = new Set<string>([
  IngestFailureClass.RATE_LIMIT,
  IngestFailureClass.PLATFORM_UNAVAILABLE,
  IngestFailureClass.TIMEOUT,
  IngestFailureClass.UNKNOWN,
]);

type IngestQueueRow = {
  id: string;
  influencer_id: string | null;
  ig_handle: string;
  status: string | null;
  started_at: string | null;
};

export class IngestService {
  private workerTimer: NodeJS.Timeout | null = null;
  private tickInProgress = false;
  private lastRefreshSweepAt = 0;

  private readonly workerPollMs = config.INGEST_WORKER_POLL_MS;
  private readonly refreshIntervalMs = config.INGEST_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
  private readonly staleRunningMs = config.INGEST_STALE_RUNNING_MINUTES * 60 * 1000;
  private readonly retryBaseMs = config.INGEST_RETRY_BASE_MS;
  private readonly maxRetries = config.INGEST_MAX_RETRIES;
  private readonly maxJobsPerTick = 2;

  startBackgroundWorker(): void {
    if (this.workerTimer) {
      return;
    }

    logger.info(`[Ingest] Background worker started (poll ${this.workerPollMs}ms)`);
    void this.runWorkerTick({ maintenance: true });
    this.workerTimer = setInterval(() => {
      void this.runWorkerTick({ maintenance: true });
    }, this.workerPollMs);
  }

  stopBackgroundWorker(): void {
    if (!this.workerTimer) {
      return;
    }
    clearInterval(this.workerTimer);
    this.workerTimer = null;
    logger.info('[Ingest] Background worker stopped');
  }

  /**
   * Trigger verification ingest for an influencer profile
   * Returns job ID for tracking
   */
  async triggerIngest(influencerId: string, igHandle: string): Promise<string> {
    // Acquire lock to avoid duplicate queue entries from rapid repeated calls.
    const lockKey = `ingest:enqueue:${influencerId}`;
    const acquired = await lockStore.acquire(lockKey, 5000);

    if (!acquired) {
      throw Errors.CONFLICT('Another ingest job is already running for this handle');
    }

    try {
      const { data: activeJobs, error: activeJobError } = await supabase
        .from('ingest_jobs')
        .select('id')
        .eq('influencer_id', influencerId)
        .in('status', ['pending', 'running'])
        .limit(1);

      if (activeJobError) {
        const detail = `${activeJobError.message}${activeJobError.details ? ` | ${activeJobError.details}` : ''}`;
        throw Errors.DATABASE_ERROR(detail);
      }

      if (activeJobs && activeJobs.length > 0) {
        return activeJobs[0].id;
      }

      // Create ingest job record
      const { data: job, error: jobError } = await supabase
        .from('ingest_jobs')
        .insert({
          influencer_id: influencerId,
          ig_handle: igHandle,
          status: 'pending',
          started_at: null,
          completed_at: null,
          failure_class: null,
          failure_detail: null,
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

      // Trigger a worker tick for near-real-time processing.
      void this.runWorkerTick({ maintenance: false });

      return job.id;
    } finally {
      // Release lock after queue insert.
      await lockStore.release(lockKey);
    }
  }

  private async runWorkerTick(options: { maintenance: boolean }): Promise<void> {
    if (this.tickInProgress) {
      return;
    }

    this.tickInProgress = true;
    try {
      if (options.maintenance) {
        await this.recoverStaleRunningJobs();
        await this.enqueuePeriodicRefreshJobsIfDue();
      }

      const jobs = await this.claimPendingJobs(this.maxJobsPerTick);
      if (jobs.length === 0) {
        return;
      }

      await Promise.all(jobs.map((job) => this.processClaimedJob(job)));
    } catch (error) {
      logger.error('[Ingest] Worker tick failed', error);
    } finally {
      this.tickInProgress = false;
    }
  }

  private async claimPendingJobs(limit: number): Promise<IngestQueueRow[]> {
    const nowIso = new Date().toISOString();
    const { data: pendingJobs, error } = await supabase
      .from('ingest_jobs')
      .select('id, influencer_id, ig_handle, status, started_at')
      .eq('status', 'pending')
      .or(`started_at.is.null,started_at.lte.${nowIso}`)
      .order('started_at', { ascending: true, nullsFirst: true })
      .limit(Math.max(limit * 3, limit));

    if (error || !pendingJobs || pendingJobs.length === 0) {
      return [];
    }

    const claimedJobs: IngestQueueRow[] = [];

    for (const pendingJob of pendingJobs) {
      if (claimedJobs.length >= limit) {
        break;
      }

      const { data: claimedJob, error: claimError } = await supabase
        .from('ingest_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          completed_at: null,
          failure_class: null,
          failure_detail: null,
        })
        .eq('id', pendingJob.id)
        .eq('status', 'pending')
        .select('id, influencer_id, ig_handle, status, started_at')
        .maybeSingle();

      if (!claimError && claimedJob) {
        claimedJobs.push(claimedJob as IngestQueueRow);
      }
    }

    return claimedJobs;
  }

  private async processClaimedJob(job: IngestQueueRow): Promise<void> {
    if (!job.influencer_id) {
      await this.handleIngestFailure(
        job.id,
        null,
        job.ig_handle,
        IngestFailureClass.PARSE_ERROR,
        'Ingest job missing influencer_id'
      );
      return;
    }

    await this.runIngestPipeline(job.influencer_id, job.ig_handle, job.id);
  }

  private async recoverStaleRunningJobs(): Promise<void> {
    const cutoffIso = new Date(Date.now() - this.staleRunningMs).toISOString();

    const { data: staleJobs, error } = await supabase
      .from('ingest_jobs')
      .select('id, influencer_id, ig_handle, started_at')
      .eq('status', 'running')
      .lt('started_at', cutoffIso)
      .limit(20);

    if (error || !staleJobs || staleJobs.length === 0) {
      return;
    }

    for (const staleJob of staleJobs) {
      await this.handleIngestFailure(
        staleJob.id,
        staleJob.influencer_id,
        staleJob.ig_handle,
        IngestFailureClass.TIMEOUT,
        'Ingest worker timeout while job was running'
      );
    }
  }

  private async enqueuePeriodicRefreshJobsIfDue(): Promise<void> {
    const nowMs = Date.now();
    if (nowMs - this.lastRefreshSweepAt < this.refreshIntervalMs) {
      return;
    }

    this.lastRefreshSweepAt = nowMs;
    const staleCutoffIso = new Date(nowMs - this.refreshIntervalMs).toISOString();

    const { data: staleProfiles, error } = await supabase
      .from('influencer_profiles')
      .select('id, ig_handle, last_scraped_at')
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${staleCutoffIso}`)
      .limit(25);

    if (error || !staleProfiles || staleProfiles.length === 0) {
      return;
    }

    let enqueued = 0;

    for (const profile of staleProfiles) {
      if (!profile.id || !profile.ig_handle) {
        continue;
      }

      const { data: activeJobs, error: activeJobError } = await supabase
        .from('ingest_jobs')
        .select('id')
        .eq('influencer_id', profile.id)
        .in('status', ['pending', 'running'])
        .limit(1);

      if (activeJobError || (activeJobs && activeJobs.length > 0)) {
        continue;
      }

      const { error: insertError } = await supabase
        .from('ingest_jobs')
        .insert({
          influencer_id: profile.id,
          ig_handle: profile.ig_handle,
          status: 'pending',
          started_at: null,
          completed_at: null,
          failure_class: null,
          failure_detail: null,
        });

      if (!insertError) {
        enqueued++;
      }
    }

    if (enqueued > 0) {
      logger.info(`[Ingest] Enqueued ${enqueued} periodic refresh job(s)`);
    }
  }

  private async countRecentFailures(igHandle: string): Promise<number> {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ingest_jobs')
      .select('id')
      .eq('ig_handle', igHandle)
      .eq('status', 'failed')
      .gte('started_at', sinceIso);

    if (error) {
      logger.warn('[Ingest] Failed to read recent failure count, defaulting to max retries', {
        igHandle,
        error: error.message,
      });
      return this.maxRetries;
    }

    return data?.length || 0;
  }

  private async enqueueRetryJob(
    influencerId: string,
    igHandle: string,
    delayMs: number,
    failureClass: string,
    failureDetail: string
  ): Promise<string | null> {
    const scheduledAtIso = new Date(Date.now() + delayMs).toISOString();

    const { data, error } = await supabase
      .from('ingest_jobs')
      .insert({
        influencer_id: influencerId,
        ig_handle: igHandle,
        status: 'pending',
        started_at: scheduledAtIso,
        completed_at: null,
        failure_class: failureClass,
        failure_detail: `retry scheduled from previous failure: ${failureDetail}`,
      })
      .select('started_at')
      .single();

    if (error) {
      logger.error('[Ingest] Failed to enqueue retry job', {
        influencerId,
        igHandle,
        error: error.message,
      });
      return null;
    }

    return data?.started_at || scheduledAtIso;
  }

  private isTransientFailure(failureClass: string): boolean {
    return TRANSIENT_FAILURE_CLASSES.has(failureClass);
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
        await this.handleIngestFailure(jobId, influencerId, igHandle, result.failureClass!, result.failureDetail!);
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
          failure_class: null,
          failure_detail: null,
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
      await this.handleIngestFailure(jobId, influencerId, igHandle, IngestFailureClass.UNKNOWN, error.message);
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
        total_views_30d: data.totalViews30d ?? null,
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
    influencerId: string | null,
    igHandle: string,
    failureClass: string,
    failureDetail: string
  ): Promise<void> {
    logger.error(`[Ingest] Job ${jobId} failed: ${failureClass} - ${failureDetail}`);

    let retryScheduledAt: string | null = null;
    if (influencerId && this.isTransientFailure(failureClass)) {
      const recentFailures = await this.countRecentFailures(igHandle);
      if (recentFailures < this.maxRetries) {
        const delayMs = this.retryBaseMs * Math.pow(2, recentFailures);
        retryScheduledAt = await this.enqueueRetryJob(
          influencerId,
          igHandle,
          delayMs,
          failureClass,
          failureDetail
        );
      }
    }

    const enrichedFailureDetail = retryScheduledAt
      ? `${failureDetail} | retry_scheduled_at=${retryScheduledAt}`
      : failureDetail;

    // Update job status
    await supabase
      .from('ingest_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        failure_class: failureClass,
        failure_detail: enrichedFailureDetail,
      })
      .eq('id', jobId);

    // Update profile verification status based on failure type
    if (
      influencerId
      && (failureClass === IngestFailureClass.INVALID_HANDLE || failureClass === IngestFailureClass.PRIVATE_ACCOUNT)
    ) {
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
