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

    // 4. Auto-analyse: determine planned session for this activity's date/day
    const actDate = new Date(act.start_date);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayName = dayNames[actDate.getDay()];
    const PLAN_START = new Date('2026-04-27');
    const diffDays = Math.floor((actDate - PLAN_START) / 86400000);
    const weekNum = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : null;

    let analysisNote = null;
    let completionPct = null;

    if (weekNum && weekNum >= 1 && weekNum <= 13) {
      // Inline week plan mirror for server-side analysis
      const weekPlans = {
        3: { Mon:'~10km', Sat:'13km', Thu:'~7km' },
        4: { Sat:'11km', Thu:'~6km' },
        5: { Mon:'~10km', Sat:'17km', Thu:'~8km' },
        6: { Mon:'~10km', Sat:'16km', Thu:'~9km' },
        7: { Mon:'~8km', Sat:'17km', Thu:'~10km' },
        8: { Mon:'~9km', Sat:'13km' },
        9: { Mon:'~12km', Sat:'18km', Thu:'~11km' },
        10: { Mon:'~11km', Sat:'17km', Thu:'~9km' },
        11: { Mon:'~8km', Sat:'12km' },
        12: { Mon:'~6km', Thu:'~6km' },
      };

      // Parse planned km from detail strings like "13km", "~10km", "total ~7km"
      const sessionPlans = weekPlans[weekNum] || {};
      const plannedStr = sessionPlans[dayName];
      if (plannedStr) {
        const plannedKm = parseFloat(plannedStr.replace('~','').replace('km',''));
        const actualKm = (act.distance || 0) / 1000;
        completionPct = Math.round(actualKm / plannedKm * 100);

        if (completionPct < 75) {
          analysisNote = `Session incomplete: ${actualKm.toFixed(2)}km completed of ~${plannedKm}km planned (${completionPct}%). Consider whether fatigue, HR, or external factors caused the early stop.`;
        } else if (completionPct < 90) {
          analysisNote = `Slightly short: ${actualKm.toFixed(2)}km of ~${plannedKm}km planned (${completionPct}%). Close — check if HR or conditions were a factor.`;
        } else {
          analysisNote = `Session complete: ${actualKm.toFixed(2)}km of ~${plannedKm}km planned (${completionPct}%).`;
        }
      }
    }

    // HR zone analysis
    let hrNote = null;
    if (act.average_heartrate) {
      const avgHr = act.average_heartrate;
      if (avgHr > 170) hrNote = `High avg HR (${Math.round(avgHr)}bpm) — check if this was an easy session or if you were working harder than planned.`;
      else if (avgHr > 155) hrNote = `Moderate-high avg HR (${Math.round(avgHr)}bpm) — within threshold range.`;
    }

    const autoAnalysis = [analysisNote, hrNote].filter(Boolean).join(' ');

    // 5. Insert into Supabase
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
        distance: parseFloat(((act.distance || 0) / 1000).toFixed(2)),
        elapsed_time: act.elapsed_time,
        moving_time: act.moving_time,
        average_speed: act.average_speed,
        pace: paceStr,
        max_speed: act.max_speed || 0,
        average_heartrate: act.average_heartrate || null,
        max_heartrate: act.max_heartrate || null,
        total_elevation_gain: act.total_elevation_gain || 0,
        suffer_score: act.suffer_score || null,
        perceived_exertion: act.perceived_exertion || null,
        auto_analysis: autoAnalysis || null,
        completion_pct: completionPct || null
      })
    });

    const sbText = await sbRes.text();
    console.log('Supabase status:', sbRes.status, sbText);

    if (!sbRes.ok) {
      return res.status(500).json({ error: 'Supabase insert failed', status: sbRes.status, detail: sbText });
    }

    res.status(200).json({ status: 'synced', activity_id: act.id, analysis: autoAnalysis });
  } catch (err) {
    console.log('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

