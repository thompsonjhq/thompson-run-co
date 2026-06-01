const { fetchAndStore, getStravaToken } = require('./strava-webhook');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const access_token = await getStravaToken();

    // Fetch last 7 days of activities from Strava
    const after = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!stravaRes.ok) throw new Error(`Strava list failed: ${stravaRes.status}`);
    const activities = await stravaRes.json();

    // Filter to runs only
    const runs = activities.filter(a =>
      a.sport_type === 'Run' || a.type === 'Run'
    );

    // Fetch existing strava_ids from Supabase so we can report what's new
    const sbRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/strava_activities?select=strava_id&strava_id=in.(${runs.map(r => r.id).join(',')})`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        }
      }
    );
    const existing = sbRes.ok ? await sbRes.json() : [];
    const existingIds = new Set(existing.map(e => String(e.strava_id)));

    const missing = runs.filter(a => !existingIds.has(String(a.id)));
    const results = [];

    for (const act of missing) {
      try {
        const result = await fetchAndStore(act.id, access_token);
        results.push({ id: act.id, name: act.name, status: 'synced', ...result });
      } catch (e) {
        results.push({ id: act.id, name: act.name, status: 'error', error: e.message });
      }
    }

    res.status(200).json({
      checked: runs.length,
      missing: missing.length,
      synced: results.filter(r => r.status === 'synced').length,
      results
    });

  } catch (err) {
    console.error('Backfill error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
