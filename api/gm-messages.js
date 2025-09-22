module.exports = async (req, res) => {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'server not configured' });
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_messages`;

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const category = url.searchParams.get('category');
      const params = new URLSearchParams();
      params.set('select', '*');
      if (category) params.set('category', `eq.${category}`);
      params.set('order', 'created_at.desc');
      params.set('limit', '200');
      const r = await fetch(`${base}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY }
      });
      const items = await r.json();
      return res.status(200).json({ ok: true, items });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.content || !body.category) return res.status(400).json({ error: 'missing content/category' });
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
        body: JSON.stringify({ content: body.content, category: body.category })
      });
      if (!r.ok) { const txt = await r.text(); return res.status(500).json({ error: 'insert failed', detail: txt }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
