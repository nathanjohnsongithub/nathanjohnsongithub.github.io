module.exports = async (req, res) => {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'server not configured' });
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_settings`;
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const sub = req.body && req.body.subscription;
    if (!sub) return res.status(400).json({ error: 'missing subscription' });
    const r = await fetch(`${base}?is_active=eq.true`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ push_subscription: sub, wants_push: true })
    });
    if (!r.ok) { const txt = await r.text(); return res.status(500).json({ error: 'save failed', detail: txt }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
