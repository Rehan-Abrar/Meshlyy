// Apify Instagram scraper service
import config from '../config/env';
import { logger } from '../middleware/logging';
import { Errors } from '../lib/errors';

export interface ApifyIngestResult {
  success: boolean;
  data?: InstagramProfileData;
  failureClass?: string;
  failureDetail?: string;
}

export interface InstagramProfileData {
  handle: string;
  followerCount: number;
  followingCount: number;
  postsCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  topCountries?: Record<string, number>;
  ageSplit?: Record<string, number>;
  genderSplit?: Record<string, number>;
}

/**
 * Failure taxonomy for ingest jobs
 */
export enum IngestFailureClass {
  RATE_LIMIT = 'RATE_LIMIT',           // Apify rate limited us
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE', // Instagram is down
  INVALID_HANDLE = 'INVALID_HANDLE',    // Handle doesn't exist
  PRIVATE_ACCOUNT = 'PRIVATE_ACCOUNT',  // Account is private
  TIMEOUT = 'TIMEOUT',                  // Job exceeded timeout
  PARSE_ERROR = 'PARSE_ERROR',          // Response parsing failed
  UNKNOWN = 'UNKNOWN',                  // Unexpected error
}

export class ApifyService {
  private readonly apiKey: string;
  private readonly actorId: string;
  private readonly timeout: number;

  constructor() {
    this.apiKey = config.APIFY_API_KEY;
    this.actorId = config.APIFY_ACTOR_ID;
    this.timeout = config.APIFY_TIMEOUT_MS;
  }

  /**
   * Fetch Instagram profile data via Apify
   * Returns success/failure with classification
   */
  async fetchProfileData(igHandle: string): Promise<ApifyIngestResult> {
    const jobStartTime = Date.now();

    try {
      logger.info(`[Apify] Starting ingest for handle: ${igHandle}`);

      // Call Apify Actor API
      const response = await fetch(
        `https://api.apify.com/v2/acts/${this.actorId}/runs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            username: igHandle,
            resultsLimit: 1,
          }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        // Classify HTTP errors
        if (response.status === 429) {
          return this.failure(
            IngestFailureClass.RATE_LIMIT,
            'Apify rate limit exceeded'
          );
        }

        if (response.status >= 500) {
          return this.failure(
            IngestFailureClass.PLATFORM_UNAVAILABLE,
            `Apify server error: ${response.status}`
          );
        }

        return this.failure(
          IngestFailureClass.UNKNOWN,
          `HTTP ${response.status}: ${errorText}`
        );
      }

      const runData = await response.json();
      const runId = runData.data.id;

      // Wait for run to complete (with timeout)
      const result = await this.waitForRun(runId);

      if (!result.success) {
        return result;
      }

      // Fetch results from dataset
      const datasetId = result.datasetId!;
      const profileData = await this.fetchDataset(datasetId);

      if (!profileData) {
        return this.failure(
          IngestFailureClass.INVALID_HANDLE,
          'Profile not found or handle does not exist'
        );
      }

      const elapsed = Date.now() - jobStartTime;
      logger.info(`[Apify] Ingest completed for ${igHandle} in ${elapsed}ms`);

      return {
        success: true,
        data: profileData,
      };
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return this.failure(
          IngestFailureClass.TIMEOUT,
          `Job exceeded ${this.timeout}ms timeout`
        );
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return this.failure(
          IngestFailureClass.PLATFORM_UNAVAILABLE,
          'Network error connecting to Apify'
        );
      }

      logger.error(`[Apify] Unexpected error for ${igHandle}:`, error);
      return this.failure(IngestFailureClass.UNKNOWN, error.message);
    }
  }

  /**
   * Wait for Apify run to complete
   */
  private async waitForRun(
    runId: string
  ): Promise<{ success: boolean; datasetId?: string; failureClass?: string; failureDetail?: string }> {
    const maxAttempts = 30; // 30 attempts * 1s = 30s max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );

      const data = await response.json();
      const status = data.data.status;

      if (status === 'SUCCEEDED') {
        return { success: true, datasetId: data.data.defaultDatasetId };
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return this.failure(
          IngestFailureClass.UNKNOWN,
          `Apify run ${status.toLowerCase()}`
        );
      }

      // Still running, wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    return this.failure(IngestFailureClass.TIMEOUT, 'Run did not complete within wait period');
  }

  /**
   * Fetch results from Apify dataset
   */
  private async fetchDataset(datasetId: string): Promise<InstagramProfileData | null> {
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.status}`);
    }

    const items = await response.json();

    if (!items || items.length === 0) {
      return null;
    }

    const profile = items[0];

    // Parse and normalize Apify response
    return {
      handle: profile.username,
      followerCount: profile.followersCount || 0,
      followingCount: profile.followsCount || 0,
      postsCount: profile.postsCount || 0,
      engagementRate: this.calculateEngagementRate(profile),
      avgLikes: profile.avgLikes || 0,
      avgComments: profile.avgComments || 0,
      topCountries: profile.topCountries || null,
      ageSplit: profile.audienceAgeGenderSplit?.ageRange || null,
      genderSplit: profile.audienceAgeGenderSplit?.gender || null,
    };
  }

  /**
   * Calculate engagement rate from profile data
   */
  private calculateEngagementRate(profile: any): number {
    const followers = profile.followersCount || 1; // Avoid division by zero
    const avgEngagement = (profile.avgLikes || 0) + (profile.avgComments || 0);
    return (avgEngagement / followers) * 100;
  }

  /**
   * Helper to create failure result
   */
  private failure(
    failureClass: IngestFailureClass,
    detail: string
  ): ApifyIngestResult {
    return {
      success: false,
      failureClass,
      failureDetail: detail,
    };
  }
}

export const apifyService = new ApifyService();
