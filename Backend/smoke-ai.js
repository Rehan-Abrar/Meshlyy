// Phase 5 AI Co-Pilot Smoke Tests
// Run with: node smoke-ai.js

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'mock-brand-token';

const tests = {
  step1_strategy: null,
  step2_brief: null,
  step3_fit_score: null,
  step4_content_brief: null,
};

async function runTests() {
  console.log('🧪 Phase 5 AI Co-Pilot Smoke Tests\n');

  // Step 1: Strategy endpoint
  console.log('Step 1: POST /v1/ai/strategy');
  try {
    const res = await fetch(`${BASE_URL}/v1/ai/strategy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creator_id: 'a0000000-0000-0000-0000-000000000001', // fashion_maven
      }),
    });
    tests.step1_strategy = {
      status: res.status,
      ok: res.ok,
      hasBody: false,
      error: null,
    };
    if (res.ok) {
      const data = await res.json();
      tests.step1_strategy.hasBody = !!data;
      tests.step1_strategy.hasExpectedFields = !!(
        data.fitScore &&
        data.audienceOverlap &&
        data.toneAlignment &&
        data.risks &&
        data.opportunities &&
        data.recommendation
      );
      console.log(`  ✅ ${res.status} - Strategy generated`);
      console.log(`  Fields: ${Object.keys(data).join(', ')}\n`);
    } else {
      const error = await res.text();
      tests.step1_strategy.error = error;
      console.log(`  ❌ ${res.status} - ${error}\n`);
    }
  } catch (err) {
    tests.step1_strategy = { error: err.message };
    console.log(`  ❌ ERROR: ${err.message}\n`);
  }

  // Step 2: Brief endpoint
  console.log('Step 2: POST /v1/ai/brief');
  try {
    const res = await fetch(`${BASE_URL}/v1/ai/brief`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_goal: 'Launch new sustainable fashion line targeting Gen Z consumers',
      }),
    });
    tests.step2_brief = {
      status: res.status,
      ok: res.ok,
      hasBody: false,
      error: null,
    };
    if (res.ok) {
      const data = await res.json();
      tests.step2_brief.hasBody = !!data;
      tests.step2_brief.hasExpectedFields = !!(
        data.title &&
        data.objective &&
        data.deliverables &&
        data.tone &&
        data.cta &&
        data.hashtags &&
        data.timeline
      );
      console.log(`  ✅ ${res.status} - Brief generated`);
      console.log(`  Fields: ${Object.keys(data).join(', ')}\n`);
    } else {
      const error = await res.text();
      tests.step2_brief.error = error;
      console.log(`  ❌ ${res.status} - ${error}\n`);
    }
  } catch (err) {
    tests.step2_brief = { error: err.message };
    console.log(`  ❌ ERROR: ${err.message}\n`);
  }

  // Step 3: Fit Score endpoint (requires a real campaign)
  console.log('Step 3: POST /v1/ai/fit-score');
  try {
    // First create a campaign
    const campaignRes = await fetch(`${BASE_URL}/v1/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'AI Test Campaign',
        status: 'DRAFT',
        target_niche: 'Fashion',
      }),
    });
    
    if (!campaignRes.ok) {
      throw new Error(`Campaign creation failed: ${await campaignRes.text()}`);
    }
    
    const campaign = await campaignRes.json();
    const campaignId = campaign.id;
    
    // Now test fit-score
    const res = await fetch(`${BASE_URL}/v1/ai/fit-score`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        creator_id: 'a0000000-0000-0000-0000-000000000001',
      }),
    });
    
    tests.step3_fit_score = {
      status: res.status,
      ok: res.ok,
      hasBody: false,
      error: null,
      campaignId,
    };
    
    if (res.ok) {
      const data = await res.json();
      tests.step3_fit_score.hasBody = !!data;
      tests.step3_fit_score.hasExpectedFields = !!(
        data.overallScore &&
        data.nicheMatch &&
        data.audienceMatch &&
        data.engagementQuality &&
        data.contentStyle &&
        data.reasoning
      );
      console.log(`  ✅ ${res.status} - Fit score calculated`);
      console.log(`  Fields: ${Object.keys(data).join(', ')}\n`);
    } else {
      const error = await res.text();
      tests.step3_fit_score.error = error;
      console.log(`  ❌ ${res.status} - ${error}\n`);
    }
  } catch (err) {
    tests.step3_fit_score = { error: err.message };
    console.log(`  ❌ ERROR: ${err.message}\n`);
  }

  // Step 4: Content Brief endpoint
  console.log('Step 4: POST /v1/ai/content-brief');
  try {
    const campaignId = tests.step3_fit_score?.campaignId;
    if (!campaignId) {
      throw new Error('No campaign ID available from step 3');
    }
    
    const res = await fetch(`${BASE_URL}/v1/ai/content-brief`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        creator_id: 'a0000000-0000-0000-0000-000000000001',
        content_format: 'reel',
      }),
    });
    
    tests.step4_content_brief = {
      status: res.status,
      ok: res.ok,
      hasBody: false,
      error: null,
    };
    
    if (res.ok) {
      const data = await res.json();
      tests.step4_content_brief.hasBody = !!data;
      tests.step4_content_brief.hasExpectedFields = !!(
        data.postType &&
        data.keyMessages &&
        data.visualGuidelines &&
        data.dosAndDonts &&
        data.exampleContent &&
        data.approvalProcess
      );
      console.log(`  ✅ ${res.status} - Content brief generated`);
      console.log(`  Fields: ${Object.keys(data).join(', ')}\n`);
    } else {
      const error = await res.text();
      tests.step4_content_brief.error = error;
      console.log(`  ❌ ${res.status} - ${error}\n`);
    }
  } catch (err) {
    tests.step4_content_brief = { error: err.message };
    console.log(`  ❌ ERROR: ${err.message}\n`);
  }

  // Summary
  console.log('\n📊 Summary:');
  const passed = Object.values(tests).filter(t => t?.ok === true).length;
  const total = Object.keys(tests).length;
  console.log(`  ${passed}/${total} tests passed\n`);

  // Write results
  const fs = require('fs');
  fs.writeFileSync('.phase5-smoke-result.json', JSON.stringify(tests, null, 2));
  console.log('Results saved to .phase5-smoke-result.json');
}

runTests().catch(console.error);
