module.exports = async function handler(req, res) {
  // GET: Strava hub verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    const verify = req.query['hub.verify_token'];
    if (verify !== process.env.STRAVA_VERIFY_TOKEN) return res.status(403).json({ error: 'Forbidden' });
    return res.status(200).json({ 'hub.challenge': challenge });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body;
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
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) {
      return res.status(500).json({ error: 'No access token', detail: tokenData });
    }

    // 2. Fetch activity from Strava
    const actRes = await fetch(`https://www.strava.com/api/v3/activities/${event.object_id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const act = await actRes.json();

    // 3. Calculate pace
    const paceStr = act.average_speed > 0
      ? (() => { const s = 1000 / act.average_speed; const m = Math.floor(s/60); const sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}`; })()
      : null;

    // 4. Insert into Supabase
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_activities?on_conflict=strava_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal'
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

    const sbText = await sbRes.text();
    console.log('Supabase status:', sbRes.status, sbText);

    if (!sbRes.ok) {
      return res.status(500).json({ error: 'Supabase insert failed', status: sbRes.status, detail: sbText });
    }

    res.status(200).json({ status: 'synced', activity_id: act.id });
  } catch (err) {
    console.log('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
