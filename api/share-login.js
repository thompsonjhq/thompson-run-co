export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  const { pin } = req.body || {};

  if (!pin || pin !== process.env.SHARE_PIN) {
    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  }

  res.setHeader(
    'Set-Cookie',
    [
      'share_access=1',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
      'Max-Age=86400'
    ].join('; ')
  );

  return res.status(200).json({ ok: true });
}
