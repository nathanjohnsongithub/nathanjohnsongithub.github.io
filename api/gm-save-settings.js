module.exports = async (req, res) => {
  // simple cookie check
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'server not configured' });
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_settings`;

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=*&is_active=eq.true&limit=1`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY }
      });
      const items = await r.json();
      return res.status(200).json({ ok: true, settings: items[0] || null });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = {
        email: body.email || null,
        wants_email: !!body.wants_email,
        wants_push: !!body.wants_push,
        category: body.category || 'loving',
        delivery_time: body.delivery_time || '08:00',
        tz: body.tz || 'America/Chicago',
        is_active: body.is_active !== false
      };
      // upsert single row (is_active=true)
      const r = await fetch(`${base}?is_active=eq.true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const txt = await r.text();
        return res.status(500).json({ error: 'save failed', detail: txt });
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
