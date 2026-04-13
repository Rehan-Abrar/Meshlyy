// Apify Instagram scraper service
import config from '../config/env';
import { logger } from '../middleware/logging';

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
  totalViews30d: number | null;
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
      let profileData: InstagramProfileData | null = null;
      try {
        profileData = await this.fetchDataset(datasetId);
      } catch (parseError: any) {
        return this.failure(
          IngestFailureClass.PARSE_ERROR,
          parseError?.message || 'Failed to parse Apify response payload'
        );
      }

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

    const posts = this.extractPosts(profile);
    const followerCount = this.readNumber(profile, ['followersCount', 'followers', 'followerCount']);
    if (followerCount === null) {
      throw new Error('Apify payload missing follower count');
    }

    const followingCount = this.readNumber(profile, ['followsCount', 'followingCount', 'following']) ?? 0;
    const postsCount = this.readNumber(profile, ['postsCount', 'posts']) ?? posts.length;
    const avgLikes = this.readNumber(profile, ['avgLikes', 'averageLikes']) ?? this.averageFromPosts(posts, ['likesCount', 'likes', 'likeCount']);
    const avgComments = this.readNumber(profile, ['avgComments', 'averageComments']) ?? this.averageFromPosts(posts, ['commentsCount', 'comments', 'commentCount']);

    if (avgLikes === null || avgComments === null) {
      throw new Error('Apify payload missing like/comment metrics for engagement calculation');
    }

    const engagementRate = this.resolveEngagementRate(profile, avgLikes, avgComments, followerCount);

    return {
      handle: String(profile.username || profile.handle || '').trim(),
      followerCount,
      followingCount,
      postsCount,
      engagementRate,
      avgLikes,
      avgComments,
      totalViews30d: this.calculateTotalViews30d(posts),
      topCountries: profile.topCountries || null,
      ageSplit: profile.audienceAgeGenderSplit?.ageRange || null,
      genderSplit: profile.audienceAgeGenderSplit?.gender || null,
    };
  }

  private readNumber(source: any, keys: string[]): number | null {
    for (const key of keys) {
      const raw = source?.[key];
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) {
        return value;
      }
    }
    return null;
  }

  private extractPosts(profile: any): any[] {
    const candidates = [profile?.latestPosts, profile?.posts, profile?.latestIgtvVideos, profile?.items];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return [];
  }

  private averageFromPosts(posts: any[], keys: string[]): number | null {
    if (!posts.length) {
      return null;
    }

    const values: number[] = [];
    for (const post of posts) {
      const metric = this.readNumber(post, keys);
      if (metric !== null) {
        values.push(metric);
      }
    }

    if (values.length === 0) {
      return null;
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(average);
  }

  private resolveEngagementRate(profile: any, avgLikes: number, avgComments: number, followers: number): number {
    const directRate = this.readNumber(profile, ['engagementRate', 'engagement_rate']);
    if (directRate !== null) {
      return directRate <= 1 ? directRate * 100 : directRate;
    }

    const safeFollowers = Math.max(followers, 1);
    return ((avgLikes + avgComments) / safeFollowers) * 100;
  }

  private parsePostTimestamp(post: any): number | null {
    const raw = post?.takenAtTimestamp ?? post?.takenAt ?? post?.timestamp ?? post?.createdAt ?? post?.date;
    if (raw === undefined || raw === null) {
      return null;
    }

    if (typeof raw === 'number') {
      return raw < 1e12 ? raw * 1000 : raw;
    }

    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateTotalViews30d(posts: any[]): number | null {
    if (!posts.length) {
      return null;
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const withTimestamps = posts
      .map((post) => ({ post, ts: this.parsePostTimestamp(post) }))
      .filter((entry) => entry.ts !== null) as Array<{ post: any; ts: number }>;

    const candidates = withTimestamps.length > 0
      ? withTimestamps.filter((entry) => entry.ts >= thirtyDaysAgo).map((entry) => entry.post)
      : posts.slice(0, 12);

    const viewValues: number[] = [];
    for (const post of candidates) {
      const views = this.readNumber(post, ['videoViewCount', 'videoPlayCount', 'playCount', 'viewCount', 'views']);
      if (views !== null) {
        viewValues.push(views);
      }
    }

    if (viewValues.length === 0) {
      return null;
    }

    return Math.round(viewValues.reduce((sum, value) => sum + value, 0));
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
