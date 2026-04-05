/**
 * Phase 4 Integration Tests
 * Tests discovery, campaigns, shortlists, and collaborations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { supabase } from '../src/config/supabase';

describe('Phase 4 Integration Tests', () => {
  let brandToken: string;
  let influencerToken: string;
  let brandId: string;
  let influencerId: string;
  let campaignId: string;

  beforeAll(async () => {
    // In real tests, these would be from test fixtures or auth setup
    // For now, using placeholder tokens (these would fail in actual execution)
    brandToken = 'test-brand-token';
    influencerToken = 'test-influencer-token';
    
    // Get brand and influencer IDs from seed data
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', '10000000-0000-0000-0000-000000000001')
      .single();
    brandId = brand?.id || '';

    const { data: influencer } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', '20000000-0000-0000-0000-000000000001')
      .single();
    influencerId = influencer?.id || '';
  });

  describe('Discovery API', () => {
    it('GET /v1/creators - should return filtered creators', async () => {
      const response = await request(app)
        .get('/v1/creators')
        .query({
          niche: 'Fashion',
          follower_min: 100000,
          engagement_min: 3.0,
          page: 1,
          limit: 20,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /v1/creators/:id - should return creator detail', async () => {
      const response = await request(app)
        .get(`/v1/creators/${influencerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', influencerId);
      expect(response.body).toHaveProperty('ig_handle');
      expect(response.body).toHaveProperty('niche_primary');
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('rate_cards');
    });

    it('GET /v1/creators/:id - should return 404 for non-existent creator', async () => {
      const response = await request(app)
        .get('/v1/creators/00000000-0000-0000-0000-000000000099')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Campaign CRUD', () => {
    it('POST /v1/campaigns - should create campaign with idempotency', async () => {
      const idempotencyKey = `test-campaign-${Date.now()}`;
      
      const campaignData = {
        title: 'Test Campaign',
        briefPreview: 'This is a test campaign',
        budget: 10000,
        currency: 'USD',
        nicheTargets: ['Fashion', 'Lifestyle'],
      };

      // First request
      const response1 = await request(app)
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${brandToken}`)
        .set('idempotency-key', idempotencyKey)
        .send(campaignData)
        .expect(201);

      campaignId = response1.body.id;
      expect(response1.body).toMatchObject(campaignData);

      // Second request with same key should return same campaign
      const response2 = await request(app)
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${brandToken}`)
        .set('idempotency-key', idempotencyKey)
        .send(campaignData)
        .expect(201);

      expect(response2.body.id).toBe(campaignId);
    });

    it('GET /v1/campaigns - should list brand campaigns', async () => {
      const response = await request(app)
        .get('/v1/campaigns')
        .set('Authorization', `Bearer ${brandToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /v1/campaigns/:id - should return campaign detail', async () => {
      const response = await request(app)
        .get(`/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${brandToken}`)
        .expect(200);

      expect(response.body.id).toBe(campaignId);
    });

    it('PATCH /v1/campaigns/:id - should update campaign', async () => {
      const response = await request(app)
        .patch(`/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${brandToken}`)
        .send({
          title: 'Updated Campaign Title',
          budget: 15000,
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Campaign Title');
      expect(response.body.budget).toBe('15000.00');
    });

    it('PATCH /v1/campaigns/:id/status - should activate campaign', async () => {
      const response = await request(app)
        .patch(`/v1/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${brandToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('Shortlist Management', () => {
    it('POST /v1/shortlists - should add influencer to shortlist', async () => {
      const response = await request(app)
        .post('/v1/shortlists')
        .set('Authorization', `Bearer ${brandToken}`)
        .send({
          influencerId,
          campaignId,
          label: 'Top Choice',
        })
        .expect(201);

      expect(response.body.influencer_id).toBe(influencerId);
      expect(response.body.campaign_id).toBe(campaignId);
    });

    it('POST /v1/shortlists - should prevent duplicate shortlist', async () => {
      const response = await request(app)
        .post('/v1/shortlists')
        .set('Authorization', `Bearer ${brandToken}`)
        .send({
          influencerId,
          campaignId,
        })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('GET /v1/shortlists - should list shortlisted influencers', async () => {
      const response = await request(app)
        .get('/v1/shortlists')
        .set('Authorization', `Bearer ${brandToken}`)
        .query({ campaignId })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].influencer_id).toBe(influencerId);
    });

    it('DELETE /v1/shortlists/:id - should remove from shortlist', async () => {
      const { data: shortlist } = await supabase
        .from('shortlists')
        .select('id')
        .eq('brand_id', brandId)
        .eq('influencer_id', influencerId)
        .single();

      await request(app)
        .delete(`/v1/shortlists/${shortlist!.id}`)
        .set('Authorization', `Bearer ${brandToken}`)
        .expect(204);
    });
  });

  describe('Collaboration Requests', () => {
    let inviteId: string;

    it('POST /v1/collaborations/invite - should send invite with idempotency', async () => {
      const idempotencyKey = `test-invite-${Date.now()}`;

      const response = await request(app)
        .post('/v1/collaborations/invite')
        .set('Authorization', `Bearer ${brandToken}`)
        .set('idempotency-key', idempotencyKey)
        .send({
          campaignId,
          influencerId,
          message: 'We would love to work with you!',
        })
        .expect(201);

      inviteId = response.body.id;
      expect(response.body.type).toBe('INVITE');
      expect(response.body.status).toBe('PENDING');
    });

    it('POST /v1/collaborations/invite - should enforce DECLINED terminal state', async () => {
      // Accept the invite first
      await request(app)
        .patch(`/v1/collaborations/${inviteId}/status`)
        .set('Authorization', `Bearer ${influencerToken}`)
        .send({ status: 'DECLINED' })
        .expect(200);

      // Try to send another invite - should fail
      const response = await request(app)
        .post('/v1/collaborations/invite')
        .set('Authorization', `Bearer ${brandToken}`)
        .send({
          campaignId,
          influencerId,
        })
        .expect(400);

      expect(response.body.error.message).toContain('DECLINED is terminal');
    });

    it('GET /v1/collaborations/incoming - should list incoming invites', async () => {
      const response = await request(app)
        .get('/v1/collaborations/incoming')
        .set('Authorization', `Bearer ${influencerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /v1/collaborations/campaign/:id - should list campaign collaborations', async () => {
      const response = await request(app)
        .get(`/v1/collaborations/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${brandToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Matched Campaigns for Influencer', () => {
    it('GET /v1/campaigns/matched - should return campaigns with brief_preview only', async () => {
      const response = await request(app)
        .get('/v1/campaigns/matched')
        .set('Authorization', `Bearer ${influencerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');

      if (response.body.data.length > 0) {
        const campaign = response.body.data[0];
        expect(campaign).toHaveProperty('brief_preview');
        expect(campaign).not.toHaveProperty('brief_data'); // Should not expose full brief
      }
    });
  });

  describe('Ownership Enforcement', () => {
    it('GET /v1/campaigns/:id - should prevent access to other brand campaigns', async () => {
      // Create second brand token (would be from fixtures)
      const otherBrandToken = 'test-other-brand-token';

      const response = await request(app)
        .get(`/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${otherBrandToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Pagination Contract', () => {
    it('GET /v1/creators - should respect pagination params', async () => {
      const response = await request(app)
        .get('/v1/creators')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('hasNext');
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('GET /v1/creators - should reject limit > 100', async () => {
      const response = await request(app)
        .get('/v1/creators')
        .query({ limit: 200 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
