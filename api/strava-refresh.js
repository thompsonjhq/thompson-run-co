const { fetchAndStore, getStravaToken } = require('./strava-webhook');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { strava_id } = req.body || {};
  if (!strava_id) return res.status(400).json({ error: 'strava_id required' });

  try {
    const access_token = await getStravaToken();
    const result = await fetchAndStore(strava_id, access_token);
    res.status(200).json({ status: 'refreshed', ...result });
  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
