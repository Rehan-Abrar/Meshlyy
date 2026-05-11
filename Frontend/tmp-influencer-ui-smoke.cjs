const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=');
      acc[key.trim()] = rest.join('=').trim();
      return acc;
    }, {});
}

(async () => {
  const envLocalPath = path.resolve('d:/Meshlyy/Frontend/.env.local');
  const envPath = path.resolve('d:/Meshlyy/Frontend/.env');
  const envRaw = fs.existsSync(envLocalPath)
    ? fs.readFileSync(envLocalPath, 'utf8')
    : fs.readFileSync(envPath, 'utf8');
  const env = parseEnv(envRaw);

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const apiBase = (env.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/$/, '');

  const supabase = createClient(supabaseUrl, anonKey);
  const suffix = Date.now();
  const email = `infl.ui.${suffix}@example.com`;
  const password = `Meshlyy!${String(suffix).slice(-6)}Aa`;

  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'INFLUENCER' } },
  });

  if (signUp.error) throw new Error(signUp.error.message);

  let session = signUp.data.session;
  if (!session) {
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.session) throw new Error(signIn.error?.message || 'no session');
    session = signIn.data.session;
  }

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  async function post(pathname, body) {
    const res = await fetch(`${apiBase}${pathname}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${pathname} (${res.status}): ${text}`);
    return res.status;
  }

  async function get(pathname) {
    const res = await fetch(`${apiBase}${pathname}`, { headers });
    const text = await res.text();
    if (!res.ok) throw new Error(`${pathname} (${res.status}): ${text}`);
    return res.status;
  }

  const igHandle = `influi_${suffix}`;
  await post('/onboarding/influencer/step1', { igHandle });
  await post('/onboarding/influencer/step2', {
    nichePrimary: 'Lifestyle',
    nicheSecondary: 'Fashion',
    bio: 'UI smoke test influencer',
  });
  await post('/onboarding/influencer/step3', {});
  await post('/onboarding/influencer/step4', {
    rateCards: [{ serviceType: 'POST', price: 500, currency: 'USD' }],
  });
  await post('/onboarding/influencer/complete', {});

  const dashboardStatus = await get('/influencer/dashboard');
  const profileStatus = await get('/profile/me');
  const incomingStatus = await get('/collaborations/incoming');
  const matchedStatus = await get('/campaigns/matched?page=1&limit=5');

  console.log(JSON.stringify({
    ok: true,
    email,
    igHandle,
    endpoints: {
      dashboard: dashboardStatus,
      profile: profileStatus,
      incoming: incomingStatus,
      matched: matchedStatus,
    },
  }, null, 2));
})().catch((error) => {
  console.error(`UI_SMOKE_FAILED: ${error.message}`);
  process.exit(1);
});
