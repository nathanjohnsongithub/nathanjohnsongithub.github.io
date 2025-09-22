const crypto = require('crypto');

function bufferFromBase64(b64) {
  return Buffer.from(b64, 'base64');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // simple cookie check set by verify-password
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('mem_auth=1')) return res.status(401).json({ error: 'not authenticated' });

  try {
  const { title, note, taken_at, is_private, imageBase64, filename, attribution_name } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'image required' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const IMPORTER_USER_ID = process.env.IMPORTER_USER_ID;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMPORTER_USER_ID) {
      return res.status(500).json({ error: 'server not configured' });
    }

    // Upload to storage via Supabase REST
  // strip data:<mime>;base64, prefix if present. Accept any mime type token.
  const fileBuf = bufferFromBase64(imageBase64.replace(/^data:[^;]+;base64,/, ''));
    const remotePath = `${crypto.randomBytes(8).toString('hex')}-${filename || 'upload.jpg'}`;

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/memories/${encodeURIComponent(remotePath)}`;
    let upRes;
    try {
      upRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/octet-stream',
          'x-upsert': 'false'
        },
        body: fileBuf
      });
    } catch (err) {
      console.error('upload fetch error', err);
      return res.status(502).json({ error: 'upload request failed', detail: String(err?.message || err), code: err?.code || null });
    }

    if (!upRes.ok) {
      const txt = await upRes.text();
      console.error('upload failed', upRes.status, txt);
      return res.status(500).json({ error: 'upload failed', status: upRes.status, detail: txt });
    }

    // get public url
    const publicUrl = `${SUPABASE_URL.replace(/\/\/$/, '')}/storage/v1/object/public/memories/${encodeURIComponent(remotePath)}`;

    // insert into public.memories via PostgREST
    const insertUrl = `${SUPABASE_URL}/rest/v1/memories`;
    const insertRes = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        title: title || null,
        note: note || null,
        image_url: publicUrl,
        taken_at: taken_at || null,
        is_private: !!is_private,
  created_by: IMPORTER_USER_ID,
  attribution_name: ['Hannah','Nathan','Both'].includes(attribution_name) ? attribution_name : null
      })
    });

    if (!insertRes.ok) {
      const txt = await insertRes.text();
      return res.status(500).json({ error: 'insert failed', detail: txt });
    }

    const created = await insertRes.json();
    return res.status(200).json({ ok: true, created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};
