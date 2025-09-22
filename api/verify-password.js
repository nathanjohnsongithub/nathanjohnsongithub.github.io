const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { password } = req.body || {};
    const hashBase64 = process.env.OLD_MEM_PW_HASH;
    const saltBase64 = process.env.OLD_MEM_PW_SALT;

    if (!hashBase64 || !saltBase64) {
      return res.status(500).json({ error: 'Password not configured' });
    }

  const salt = Buffer.from(saltBase64, 'base64');
  const derived = crypto.scryptSync(password || '', salt, 64);
  const hashBuf = Buffer.from(hashBase64, 'base64');

  // timingSafeEqual requires equal-length buffers
  if (hashBuf.length === derived.length && crypto.timingSafeEqual(derived, hashBuf)) {
      // Set an HttpOnly cookie for a year. In development omit the Secure flag so
      // the browser will accept the cookie on http://localhost when using
      // `vercel dev`. In production keep Secure.
  const maxAge = 60 * 60 * 24 * 365;
  const secureAttr = (process.env.NODE_ENV === 'production') ? '; Secure' : '';
  const serverCookie = `mem_auth=1; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureAttr}`;
  // Non-HttpOnly marker so client-side JS can detect auth status for page guards
  const markerCookie = `mem_auth_mark=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureAttr}`;
  res.setHeader('Set-Cookie', [serverCookie, markerCookie]);
      return res.status(200).json({ ok: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
};
