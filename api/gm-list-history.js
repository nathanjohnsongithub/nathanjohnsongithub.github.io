module.exports = async (req, res) => {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'server not configured' });
  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_history`;
  try {
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'created_at.desc');
    params.set('limit', '200');
    const r = await fetch(`${base}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY }
    });
    const items = await r.json();
    return res.status(200).json({ ok: true, items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
