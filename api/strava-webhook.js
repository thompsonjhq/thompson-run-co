// Handles both Strava webhook validation (GET) and activity events (POST)
export default async function handler(req, res) {
  // GET: Strava hub verification challenge
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    const verify = req.query['hub.verify_token'];
    if (verify !== process.env.STRAVA_VERIFY_TOKEN) return res.status(403).json({ error: 'Forbidden' });
    return res.status(200).json({ 'hub.challenge': challenge });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body;
  // Only handle new activity creates
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    // 1. Refresh Strava token
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: process.env.STRAVA_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });
    const { access_token } = await tokenRes.json();

    // 2. Fetch activity details from Strava
    const actRes = await fetch(`https://www.strava.com/api/v3/activities/${event.object_id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const act = await actRes.json();

    // 3. Calculate pace (min/km string) from average_speed (m/s)
    const paceStr = act.average_speed > 0
      ? (() => { const s = 1000 / act.average_speed; const m = Math.floor(s/60); const sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}`; })()
      : null;

    // 4. Upsert into Supabase
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        strava_id: act.id,
        name: act.name,
        sport_type: act.sport_type,
        start_date: act.start_date,
        distance: act.distance,
        elapsed_time: act.elapsed_time,
        moving_time: act.moving_time,
        average_speed: act.average_speed,
        pace: paceStr,
        max_speed: act.max_speed || 0,
        average_heartrate: act.average_heartrate || null,
        max_heartrate: act.max_heartrate || null,
        total_elevation_gain: act.total_elevation_gain || 0
      })
    });

    if (!sbRes.ok) {
      const err = await sbRes.text();
      return res.status(500).json({ error: 'Supabase insert failed', detail: err });
    }

    res.status(200).json({ status: 'synced', activity_id: act.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
