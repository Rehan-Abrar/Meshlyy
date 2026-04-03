// Integration tests for Phase 2: Onboarding flows
import { randomUUID } from 'crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from './app';
import { supabase } from './config/supabase';
import { lockStore } from './stores';

describe('Phase 2: Onboarding & Ingest Integration Tests', () => {
  const TOKENS = {
    brand: 'mock-brand-token',
    influencer: 'mock-influencer-token',
    influencer2: 'different-user-token',
    influencerNew: 'new-influencer-token',
  } as const;

  const USERS = {
    brand: {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'brand.test@example.com',
      role: 'BRAND',
    },
    influencer: {
      id: '20000000-0000-0000-0000-000000000001',
      email: 'influencer.test@example.com',
      role: 'INFLUENCER',
    },
    influencer2: {
      id: '20000000-0000-0000-0000-000000000002',
      email: 'influencer.other@example.com',
      role: 'INFLUENCER',
    },
    influencerNew: {
      id: '20000000-0000-0000-0000-000000000003',
      email: 'influencer.new@example.com',
      role: 'INFLUENCER',
    },
  } as const;

  const ALL_USER_IDS = [USERS.brand.id, USERS.influencer.id, USERS.influencer2.id, USERS.influencerNew.id];
  let createdHandles: string[] = [];

  function buildAuthHeader(token: string): string {
    return `Bearer ${token}`;
  }

  function uniqueHandle(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 18)}`.toLowerCase();
  }

  async function assertNoDbError(context: string, error: any) {
    if (!error) {
      return;
    }

    const details = [error.message, error.details, error.hint].filter(Boolean).join(' | ');
    throw new Error(`${context}: ${details}`);
  }

  async function cleanupTestData() {
    const safeCleanup = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (error) {
        console.error(`[cleanupTestData] ${label} failed`, error);
      }
    };

    let profileIds: string[] = [];

    await safeCleanup('read influencer profiles', async () => {
      const { data: profiles, error: profileReadError } = await supabase
        .from('influencer_profiles')
        .select('id')
        .in('user_id', ALL_USER_IDS);
      await assertNoDbError('cleanup influencer profile read failed', profileReadError);
      profileIds = (profiles || []).map((profile) => profile.id);
    });

    if (profileIds.length > 0) {
      await safeCleanup('delete admin_flags by influencer_id', async () => {
        const { error: flagDeleteError } = await supabase
          .from('admin_flags')
          .delete()
          .in('influencer_id', profileIds);
        await assertNoDbError('cleanup admin_flags failed', flagDeleteError);
      });

      await safeCleanup('delete influencer_stats by influencer_id', async () => {
        const { error: statsDeleteError } = await supabase
          .from('influencer_stats')
          .delete()
          .in('influencer_id', profileIds);
        await assertNoDbError('cleanup influencer_stats failed', statsDeleteError);
      });

      await safeCleanup('delete rate_cards by influencer_id', async () => {
        const { error: rateCardDeleteError } = await supabase
          .from('rate_cards')
          .delete()
          .in('influencer_id', profileIds);
        await assertNoDbError('cleanup rate_cards failed', rateCardDeleteError);
      });

      await safeCleanup('delete ingest_jobs by influencer_id', async () => {
        const { error: ingestDeleteError } = await supabase
          .from('ingest_jobs')
          .delete()
          .in('influencer_id', profileIds);
        await assertNoDbError('cleanup ingest_jobs by influencer_id failed', ingestDeleteError);
      });
    }

    if (createdHandles.length > 0) {
      await safeCleanup('delete ingest_jobs by handle', async () => {
        const { error: ingestByHandleDeleteError } = await supabase
          .from('ingest_jobs')
          .delete()
          .in('ig_handle', createdHandles);
        await assertNoDbError('cleanup ingest_jobs by handle failed', ingestByHandleDeleteError);
      });
    }

    await safeCleanup('delete influencer_profiles by user_id', async () => {
      const { error: influencerDeleteError } = await supabase
        .from('influencer_profiles')
        .delete()
        .in('user_id', ALL_USER_IDS);
      await assertNoDbError('cleanup influencer_profiles failed', influencerDeleteError);
    });

    await safeCleanup('delete brand_profiles by user_id', async () => {
      const { error: brandDeleteError } = await supabase
        .from('brand_profiles')
        .delete()
        .in('user_id', ALL_USER_IDS);
      await assertNoDbError('cleanup brand_profiles failed', brandDeleteError);
    });

    await safeCleanup('delete users by id', async () => {
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .in('id', ALL_USER_IDS);
      await assertNoDbError('cleanup users failed', userDeleteError);
    });
  }

  async function createFreshTestUsers() {
    const rows = [USERS.brand, USERS.influencer, USERS.influencer2, USERS.influencerNew].map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      onboarding_step: 0,
      onboarding_completed: false,
      is_deleted: false,
    }));

    const { error } = await supabase
      .from('users')
      .insert(rows);
    await assertNoDbError('create fresh users failed', error);
  }

  async function completeInfluencerStep1To3(token: string, handle: string) {
    createdHandles.push(handle);

    const step1 = await request(app)
      .post('/v1/onboarding/influencer/step1')
      .set('Authorization', buildAuthHeader(token))
      .send({ igHandle: handle });
    expect(step1.status).toBe(200);

    const step2 = await request(app)
      .post('/v1/onboarding/influencer/step2')
      .set('Authorization', buildAuthHeader(token))
      .send({ nichePrimary: 'Fashion', nicheSecondary: 'Beauty', bio: 'Test bio' });
    expect(step2.status).toBe(200);

    const step3 = await request(app)
      .post('/v1/onboarding/influencer/step3')
      .set('Authorization', buildAuthHeader(token))
      .send({ portfolioUrl: 'https://example.com/p', mediaKitUrl: 'https://example.com/m.pdf' });
    expect(step3.status).toBe(200);
  }

  beforeEach(async () => {
    createdHandles = [];
    await cleanupTestData();
    await createFreshTestUsers();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Brand Onboarding', () => {
    it('should complete brand onboarding', async () => {
      const response = await request(app)
        .post('/v1/onboarding/brand')
        .set('Authorization', buildAuthHeader(TOKENS.brand))
        .send({
          companyName: 'Test Fashion Co',
          website: 'https://testfashion.com',
          industry: 'Fashion',
          budgetRangeMin: 5000,
          budgetRangeMax: 50000,
          toneVoice: 'Modern and trendy',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('brandId');
    });

    it('should reject duplicate brand profile', async () => {
      // Try to create brand profile again
      const first = await request(app)
        .post('/v1/onboarding/brand')
        .set('Authorization', buildAuthHeader(TOKENS.brand))
        .send({ companyName: 'Brand One' });
      expect(first.status).toBe(201);

      const response = await request(app)
        .post('/v1/onboarding/brand')
        .set('Authorization', buildAuthHeader(TOKENS.brand))
        .send({
          companyName: 'Another Brand',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should get onboarding status', async () => {
      const onboard = await request(app)
        .post('/v1/onboarding/brand')
        .set('Authorization', buildAuthHeader(TOKENS.brand))
        .send({ companyName: 'Status Brand' });
      expect(onboard.status).toBe(201);

      const response = await request(app)
        .get('/v1/onboarding/status')
        .set('Authorization', buildAuthHeader(TOKENS.brand));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('onboardingCompleted', true);
      expect(response.body).toHaveProperty('role', 'BRAND');
    });
  });

  describe('Influencer Onboarding - Step 1: Handle Validation', () => {
    it('should accept valid Instagram handle', async () => {
      const handle = uniqueHandle('valid');
      createdHandles.push(handle);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: handle,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject invalid handle format', async () => {
      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: 'invalid handle with spaces!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate handle', async () => {
      const handle = uniqueHandle('dup');
      createdHandles.push(handle);

      // Create first profile
      await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: handle,
        });

      // Try to use same handle with different user
      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer2))
        .send({
          igHandle: handle,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already registered');
    });
  });

  describe('Influencer Onboarding - Step 2: Niche and Bio', () => {
    it('should save niche and bio', async () => {
      const handle = uniqueHandle('step2');
      createdHandles.push(handle);

      const step1 = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({ igHandle: handle });
      expect(step1.status).toBe(200);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step2')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          nichePrimary: 'Fashion',
          nicheSecondary: 'Beauty',
          bio: 'Fashion influencer based in NYC',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject if step 1 not completed', async () => {
      const response = await request(app)
        .post('/v1/onboarding/influencer/step2')
        .set('Authorization', buildAuthHeader(TOKENS.influencerNew))
        .send({
          nichePrimary: 'Fashion',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Please complete step 1 first');
    });
  });

  describe('Influencer Onboarding - Step 3: Portfolio', () => {
    it('should save portfolio and media kit URLs', async () => {
      const handle = uniqueHandle('step3');
      await completeInfluencerStep1To3(TOKENS.influencer, handle);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step3')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          portfolioUrl: 'https://example.com/portfolio',
          mediaKitUrl: 'https://example.com/mediakit.pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Influencer Onboarding - Step 4: Rate Cards & Completion', () => {
    it('should complete onboarding and trigger ingest', async () => {
      const handle = uniqueHandle('step4');
      await completeInfluencerStep1To3(TOKENS.influencer, handle);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step4')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          rateCards: [
            { serviceType: 'POST', price: 2500, currency: 'USD' },
            { serviceType: 'STORY', price: 800, currency: 'USD' },
            { serviceType: 'REEL', price: 3000, currency: 'USD' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.message).toContain('verification in progress');
    }, 60000);

    it('should mark user onboarding as complete', async () => {
      const handle = uniqueHandle('status4');
      await completeInfluencerStep1To3(TOKENS.influencer, handle);

      const step4 = await request(app)
        .post('/v1/onboarding/influencer/step4')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          rateCards: [
            { serviceType: 'POST', price: 2500, currency: 'USD' },
          ],
        });
      expect(step4.status).toBe(201);

      const response = await request(app)
        .get('/v1/onboarding/status')
        .set('Authorization', buildAuthHeader(TOKENS.influencer));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('onboardingCompleted', true);
      expect(response.body).toHaveProperty('currentStep', 5);
    }, 60000);
  });

  describe('Resubmission Throttling', () => {
    it('should allow resubmission after 24 hours', async () => {
      const handle = uniqueHandle('resubmit');
      createdHandles.push(handle);

      const initial = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({ igHandle: handle });
      expect(initial.status).toBe(200);

      await supabase
        .from('influencer_profiles')
        .update({
          resubmission_count: 1,
          last_resubmitted_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', USERS.influencer.id);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: handle,
        });

      expect(response.status).toBe(200);
    });

    it('should reject resubmission within 24 hours', async () => {
      const handle = uniqueHandle('cooldown');
      createdHandles.push(handle);

      const initial = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({ igHandle: handle });
      expect(initial.status).toBe(200);

      await supabase
        .from('influencer_profiles')
        .update({
          resubmission_count: 1,
          last_resubmitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', USERS.influencer.id);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: handle,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('wait');
      expect(response.body.error.message).toContain('hours');
    });

    it('should reject after max 5 resubmissions', async () => {
      const handle = uniqueHandle('maxresub');
      createdHandles.push(handle);

      const initial = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({ igHandle: handle });
      expect(initial.status).toBe(200);

      await supabase
        .from('influencer_profiles')
        .update({
          resubmission_count: 5,
          last_resubmitted_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', USERS.influencer.id);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step1')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          igHandle: handle,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Maximum resubmission attempts (5)');
    });
  });

  describe('Concurrency Lock', () => {
    it('should return conflict when ingest lock is already held', async () => {
      const handle = uniqueHandle('lock');
      await completeInfluencerStep1To3(TOKENS.influencer, handle);

      const lockKey = `ingest:${handle}`;
      const acquired = await lockStore.acquire(lockKey, 5000);
      expect(acquired).toBe(true);

      const response = await request(app)
        .post('/v1/onboarding/influencer/step4')
        .set('Authorization', buildAuthHeader(TOKENS.influencer))
        .send({
          rateCards: [
            { serviceType: 'POST', price: 2500, currency: 'USD' },
          ],
        });

      await lockStore.release(lockKey);
      expect(response.status).toBe(409);
    });
  });
});
