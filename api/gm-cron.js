const fetch = global.fetch;

function toLocalScheduledTz(nowUtc, timeHHmm, tz) {
  // Compute the next datetime in tz with given time; simple approach via Intl and Date parsing
  try {
    const [hh, mm] = (timeHHmm || '08:00').split(':').map(Number);
    const now = new Date(nowUtc);
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(now).reduce((o, p) => (o[p.type] = p.value, o), {});
    const localIso = `${parts.year}-${parts.month}-${parts.day}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
    const local = new Date(localIso + 'Z'); // approximate; note: real tz conversion would need a lib
    return local;
  } catch { return new Date(nowUtc); }
}

module.exports = async (req, res) => {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'server not configured' });

  try {
    // load active settings
    const sRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_settings?select=*&is_active=eq.true&limit=1`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY }
    });
    const sItems = await sRes.json();
    const settings = sItems[0];
    if (!settings) return res.status(200).json({ ok: true, skipped: 'no settings' });

    // determine if we should send now (window ~5 minutes)
    const now = new Date();
    const scheduledLocal = toLocalScheduledTz(now.toISOString(), settings.delivery_time, settings.tz);
    const diffMs = Math.abs(now.getTime() - scheduledLocal.getTime());
    if (diffMs > 5 * 60 * 1000) return res.status(200).json({ ok: true, skipped: 'outside window' });

    // choose a message by category randomly
    const mUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_messages?select=*&category=eq.${settings.category}&limit=200`;
    const mRes = await fetch(mUrl, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY } });
    const pool = await mRes.json();
    if (!Array.isArray(pool) || pool.length === 0) return res.status(200).json({ ok: true, skipped: 'no messages' });
    const msg = pool[Math.floor(Math.random() * pool.length)];

    const tasks = [];
    const histBase = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/good_morning_history`;

    async function record(channel, status, error) {
      try {
        await fetch(histBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
          body: JSON.stringify({ scheduled_for: scheduledLocal.toISOString(), delivered_at: new Date().toISOString(), channel, category: settings.category, content: msg.content, status: status || 'sent', error: error || null })
        });
      } catch {}
    }

    // email
    if (settings.wants_email && settings.email) {
      tasks.push((async () => {
        try {
          // Placeholder: hook up your email provider here
          // e.g., fetch(RESEND_URL, { ... })
          await record('email', 'sent');
          return { channel: 'email', ok: true };
        } catch (e) { await record('email', 'failed', String(e)); return { channel: 'email', ok: false, error: String(e) }; }
      })());
    }
    // push
    if (settings.wants_push && settings.push_subscription) {
      tasks.push((async () => {
        try {
          // Placeholder: Use Web Push with your VAPID keys server-side
          await record('push', 'sent');
          return { channel: 'push', ok: true };
        } catch (e) { await record('push', 'failed', String(e)); return { channel: 'push', ok: false, error: String(e) }; }
      })());
    }

    const results = await Promise.all(tasks);
    return res.status(200).json({ ok: true, results, message: msg.content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
