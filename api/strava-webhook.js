// Shared helper — fetch a Strava activity and upsert into Supabase with full analysis
async function fetchAndStore(stravaId, access_token) {
  // 1. Fetch detailed activity
  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const act = await actRes.json();
  if (!actRes.ok) throw new Error(`Strava fetch failed: ${act.message}`);

  // 2. Pace string
  const paceStr = act.average_speed > 0
    ? (() => { const s = 1000 / act.average_speed; const m = Math.floor(s/60); const sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}` })()
    : null;

  // 3. Splits analysis
  const splits = act.splits_metric || [];
  const splitsFormatted = splits.map((sp, i) => ({
    km: i + 1,
    distance_m: Math.round(sp.distance),
    elapsed_s: sp.elapsed_time,
    moving_s: sp.moving_time,
    pace: sp.average_speed > 0
      ? (() => { const s = 1000/sp.average_speed; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`})()
      : null,
    hr: sp.average_heartrate ? Math.round(sp.average_heartrate) : null,
    elevation: sp.elevation_difference ? Math.round(sp.elevation_difference) : null,
  }));

  // 4. Laps
  const laps = (act.laps || []).map((lap, i) => ({
    lap: i + 1,
    distance_m: Math.round(lap.distance),
    elapsed_s: lap.elapsed_time,
    moving_s: lap.moving_time,
    pace: lap.average_speed > 0
      ? (() => { const s = 1000/lap.average_speed; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`})()
      : null,
    hr: lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
    cadence: lap.average_cadence ? Math.round(lap.average_cadence) : null,
  }));

  // 5. Best efforts (PRs on this run)
  const bestEfforts = (act.best_efforts || []).map(e => ({
    name: e.name,
    distance_m: e.distance,
    elapsed_s: e.elapsed_time,
    pace: e.average_speed > 0
      ? (() => { const s = 1000/e.average_speed; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`})()
      : null,
    pr: e.pr_rank === 1,
  }));

  // 6. Determine planned session for this activity
  const actDate = new Date(act.start_date);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayName = dayNames[actDate.getDay()];
  const PLAN_START = new Date('2026-04-27');
  const diffDays = Math.floor((actDate - PLAN_START) / 86400000);
  const weekNum = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : null;

  // Weekly plan mirror for server-side analysis
  // Format: { dot, type, targetKm, intervalDetail }
  const weekPlan = {
    1: { Mon:{dot:'easy',type:'Easy Run',km:5}, Tue:{dot:'easy',type:'Easy Run',km:6}, Sat:{dot:'easy',type:'Long Run',km:10} },
    2: { Mon:{dot:'easy',type:'Strides',km:7}, Tue:{dot:'easy',type:'Easy Run',km:7}, Sat:{dot:'easy',type:'Long Run',km:12} },
    3: { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:8,dist:400,targetPace:'4:10'}}, Tue:{dot:'easy',type:'Easy Run',km:8}, Wed:{dot:'moderate',type:'Tempo',km:7,tempo:{duration_min:12,targetPace:'4:25'}}, Thu:{dot:'strength',type:'Strength'}, Sat:{dot:'easy',type:'Long Run',km:13} },
    4: { Mon:{dot:'easy',type:'Strides',km:7}, Tue:{dot:'easy',type:'Easy Run',km:6}, Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:10,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:11} },
    5: { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:6,dist:1000,targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:9}, Thu:{dot:'moderate',type:'Tempo',km:8,tempo:{duration_min:20,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
    6: { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:5,dist:1200,targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:16} },
    7: { Mon:{dot:'hard',type:'Intervals',km:8,intervals:{reps:10,dist:400,targetPace:'3:58'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:10,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
    8: { Mon:{dot:'hard',type:'Intervals',km:9,intervals:{reps:6,dist:800,targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:8}, Sat:{dot:'easy',type:'Long Run',km:13} },
    9: { Mon:{dot:'hard',type:'Intervals',km:12,intervals:{reps:4,dist:2000,targetPace:'4:10'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:11,tempo:{duration_min:35,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:18} },
    10: { Mon:{dot:'hard',type:'Race Pace',km:11,intervals:{reps:3,dist:3000,targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:25,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
    11: { Mon:{dot:'hard',type:'Intervals',km:8,intervals:{reps:12,dist:400,targetPace:'3:55'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Sat:{dot:'race',type:'Race Simulation',km:12} },
    12: { Mon:{dot:'hard',type:'Intervals',km:6,intervals:{reps:6,dist:600,targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:7}, Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:12,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Easy Run',km:9} },
    13: { Mon:{dot:'easy',type:'Easy Run',km:5}, Tue:{dot:'easy',type:'Shakeout',km:4}, Thu:{dot:'easy',type:'Shakeout',km:3}, Sat:{dot:'race',type:'RACE DAY',km:12} },
  };

  const plannedSession = weekNum && weekPlan[weekNum] ? weekPlan[weekNum][dayName] : null;
  const actualKm = (act.distance || 0) / 1000;
  let completionPct = null;
  let autoAnalysis = null;
  let sessionType = null; // auto-detected

  if (plannedSession) {
    completionPct = plannedSession.km ? Math.round(actualKm / plannedSession.km * 100) : null;

    // AUTO-DETECT session type from splits when plan says intervals/tempo
    if (plannedSession.dot === 'hard' && splitsFormatted.length >= 2) {
      // Intervals: look for large pace variance between splits (fast splits vs rest/easy splits)
      const paces = splitsFormatted.map(s => {
        if (!s.pace) return null;
        const [m, sec] = s.pace.split(':').map(Number);
        return m * 60 + sec;
      }).filter(Boolean);

      if (paces.length >= 2) {
        const fastest = Math.min(...paces);
        const slowest = Math.max(...paces);
        const variance = slowest - fastest;

        if (variance > 45) {
          sessionType = 'intervals'; // >45s/km spread = alternating effort
        } else if (fastest < 270) {
          sessionType = 'tempo'; // consistently fast
        } else {
          sessionType = 'easy';
        }
      }
    } else if (plannedSession.dot === 'moderate') {
      sessionType = 'tempo';
    } else if (plannedSession.dot === 'easy') {
      sessionType = 'easy';
    }

    // Build analysis note
    const notes = [];

    // Distance completion
    if (completionPct !== null) {
      if (completionPct < 75) notes.push(`Incomplete: ${actualKm.toFixed(2)}km of ${plannedSession.km}km planned (${completionPct}%).`);
      else if (completionPct < 90) notes.push(`Slightly short: ${actualKm.toFixed(2)}km of ${plannedSession.km}km planned (${completionPct}%).`);
      else notes.push(`Distance complete: ${actualKm.toFixed(2)}km of ${plannedSession.km}km planned.`);
    }

    // Interval analysis
    if (sessionType === 'intervals' && plannedSession.intervals && splitsFormatted.length) {
      const { reps, dist, targetPace } = plannedSession.intervals;
      const [tm, ts] = targetPace.split(':').map(Number);
      const targetSecs = tm * 60 + ts;

      // Identify fast splits (within 30s/km of target)
      const fastSplits = splitsFormatted.filter(s => {
        if (!s.pace) return false;
        const [m, sec] = s.pace.split(':').map(Number);
        return (m * 60 + sec) <= targetSecs + 30;
      });

      const onTargetSplits = fastSplits.filter(s => {
        const [m, sec] = s.pace.split(':').map(Number);
        return (m * 60 + sec) <= targetSecs + 10;
      });

      notes.push(`Intervals: detected ${fastSplits.length} fast km-splits vs ${reps} planned reps. ${onTargetSplits.length} split(s) hit target pace (${targetPace}/km).`);

      // Check for fade
      if (fastSplits.length >= 3) {
        const firstHalf = fastSplits.slice(0, Math.floor(fastSplits.length/2));
        const secondHalf = fastSplits.slice(Math.floor(fastSplits.length/2));
        const avgFirst = firstHalf.reduce((s,x) => { const [m,sec]=x.pace.split(':').map(Number); return s+m*60+sec; }, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s,x) => { const [m,sec]=x.pace.split(':').map(Number); return s+m*60+sec; }, 0) / secondHalf.length;
        if (avgSecond - avgFirst > 15) notes.push(`Pace fade detected in later intervals (+${Math.round(avgSecond-avgFirst)}s/km slower).`);
      }
    }

    // Tempo analysis
    if (sessionType === 'tempo' && plannedSession.tempo && splitsFormatted.length) {
      const { duration_min, targetPace } = plannedSession.tempo;
      const [tm, ts] = targetPace.split(':').map(Number);
      const targetSecs = tm * 60 + ts;

      const tempoSplits = splitsFormatted.filter(s => {
        if (!s.pace) return false;
        const [m, sec] = s.pace.split(':').map(Number);
        return (m * 60 + sec) <= targetSecs + 20;
      });

      const targetKmAtPace = duration_min / parseFloat(targetPace.replace(':','.'));
      notes.push(`Tempo: ${tempoSplits.length} km-splits at or near target pace (${targetPace}/km). Planned ~${Math.round(duration_min)} min effort.`);
    }

    // HR note
    if (act.average_heartrate) {
      const hr = Math.round(act.average_heartrate);
      if (plannedSession.dot === 'easy' && hr > 155) {
        notes.push(`HR elevated for easy run (${hr}bpm avg) — consider slowing down or checking conditions.`);
      } else if (plannedSession.dot === 'hard' && hr > 170) {
        notes.push(`High HR during hard session (${hr}bpm avg) — normal for intervals.`);
      } else {
        notes.push(`Avg HR: ${hr}bpm.`);
      }
    }

    autoAnalysis = notes.join(' ');
  }

  // 7. Upsert into Supabase with all fields
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
      description: act.description || null,
      sport_type: act.sport_type,
      workout_type: act.workout_type ?? null,
      start_date: act.start_date,
      start_date_local: act.start_date_local,
      distance: parseFloat(((act.distance || 0) / 1000).toFixed(2)),
      elapsed_time: act.elapsed_time,
      moving_time: act.moving_time,
      average_speed: act.average_speed,
      pace: paceStr,
      max_speed: act.max_speed || 0,
      average_heartrate: act.average_heartrate || null,
      max_heartrate: act.max_heartrate || null,
      total_elevation_gain: act.total_elevation_gain || 0,
      average_cadence: act.average_cadence || null,
      average_temp: act.average_temp ?? null,
      calories: act.calories || null,
      suffer_score: act.suffer_score || null,
      perceived_exertion: act.perceived_exertion || null,
      pr_count: act.pr_count || 0,
      achievement_count: act.achievement_count || 0,
      gear_id: act.gear_id || null,
      gear_name: act.gear?.name || null,
      splits_metric: splitsFormatted.length ? splitsFormatted : null,
      laps: laps.length ? laps : null,
      best_efforts: bestEfforts.length ? bestEfforts : null,
      auto_analysis: autoAnalysis || null,
      completion_pct: completionPct || null,
      session_type_detected: sessionType || null,
    })
  });

  if (!sbRes.ok) {
    const sbText = await sbRes.text();
    throw new Error(`Supabase upsert failed: ${sbRes.status} ${sbText}`);
  }

  return { activity_id: act.id, analysis: autoAnalysis, session_type: sessionType };
}

// ── Shared token refresh ──
async function getStravaToken() {
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
  if (!tokenData.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

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
  if (event.object_type !== 'activity') return res.status(200).json({ status: 'ignored' });

  // Handle both 'create' AND 'update' events (picks up gear, description edits etc.)
  if (event.aspect_type !== 'create' && event.aspect_type !== 'update') {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const access_token = await getStravaToken();
    const result = await fetchAndStore(event.object_id, access_token);
    res.status(200).json({ status: 'synced', ...result });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Export shared helpers for the refresh endpoint
module.exports.fetchAndStore = fetchAndStore;
module.exports.getStravaToken = getStravaToken;
