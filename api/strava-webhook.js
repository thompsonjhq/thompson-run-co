// ── HELPERS ──────────────────────────────────────────────────────────────────

function parsePace(speed) {
  if (!speed || speed <= 0) return null;
  const s = 1000 / speed;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

function paceToSecs(paceStr) {
  if (!paceStr) return null;
  const [m, s] = paceStr.split(':').map(Number);
  return m * 60 + (s || 0);
}

// ── PLAN MIRROR ───────────────────────────────────────────────────────────────
// Keep in sync with app.js weekPlan

const PLAN_START = new Date('2026-04-27');

const weekPlan = {
  1:  { Mon:{dot:'easy',type:'Easy Run',km:5},   Tue:{dot:'easy',type:'Easy Run',km:6},   Sat:{dot:'easy',type:'Long Run',km:10} },
  2:  { Mon:{dot:'easy',type:'Strides',km:7},    Tue:{dot:'easy',type:'Easy Run',km:7},   Sat:{dot:'easy',type:'Long Run',km:12} },
  3:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:8, dist:400, targetPace:'4:10'}},  Tue:{dot:'easy',type:'Easy Run',km:8},  Wed:{dot:'moderate',type:'Tempo',km:7,tempo:{duration_min:12,targetPace:'4:25'}},  Thu:{dot:'strength',type:'Strength'}, Sat:{dot:'easy',type:'Long Run',km:13} },
  4:  { Mon:{dot:'easy',type:'Strides',km:7},    Tue:{dot:'easy',type:'Easy Run',km:6},   Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:10,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:11} },
  5:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:6, dist:1000,targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:9},  Wed:{dot:'moderate',type:'Tempo',km:8,tempo:{duration_min:20,targetPace:'4:25'}}, Thu:{dot:'strength',type:'Strength'}, Sat:{dot:'easy',type:'Long Run',km:17} },
  6:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:5, dist:1200,targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:16} },
  7:  { Mon:{dot:'hard',type:'Intervals',km:8, intervals:{reps:10,dist:400, targetPace:'3:58'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:10,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
  8:  { Mon:{dot:'hard',type:'Intervals',km:9, intervals:{reps:6, dist:800, targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:8},  Sat:{dot:'easy',type:'Long Run',km:13} },
  9:  { Mon:{dot:'hard',type:'Intervals',km:12,intervals:{reps:4, dist:2000,targetPace:'4:10'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:11,tempo:{duration_min:35,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:18} },
  10: { Mon:{dot:'hard',type:'Race Pace',km:11,intervals:{reps:3, dist:3000,targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:25,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
  11: { Mon:{dot:'hard',type:'Intervals',km:8, intervals:{reps:12,dist:400, targetPace:'3:55'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Sat:{dot:'race',type:'Race Simulation',km:12} },
  12: { Mon:{dot:'hard',type:'Intervals',km:6, intervals:{reps:6, dist:600, targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:7},  Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:12,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Easy Run',km:9} },
  13: { Mon:{dot:'easy',type:'Easy Run',km:5}, Tue:{dot:'easy',type:'Shakeout',km:4}, Thu:{dot:'easy',type:'Shakeout',km:3}, Sat:{dot:'race',type:'RACE DAY',km:12} },
};

// ── SESSION TYPE DETECTION ────────────────────────────────────────────────────
//
// Priority order:
//   1. Lap count matches planned reps exactly → definitive intervals
//   2. Lap pace variance > 45s/km → intervals pattern
//   3. km-split variance (fallback when no useful laps)
//   4. Plan dot for easy/moderate

function detectSessionType(plannedSession, laps, splitsFormatted) {
  if (!plannedSession) return null;

  if (plannedSession.dot === 'hard') {
    // ── 1. Lap-based detection (most reliable) ────────────────────────────
    if (laps.length >= 2) {
      const lapPaceSecs = laps.map(l => paceToSecs(l.pace)).filter(Boolean);

      if (lapPaceSecs.length >= 2) {
        const fastest = Math.min(...lapPaceSecs);
        const slowest = Math.max(...lapPaceSecs);
        const lapVariance = slowest - fastest;

        // Exact rep-count match is the strongest possible signal
        if (plannedSession.intervals && laps.length === plannedSession.intervals.reps) {
          return 'intervals'; // definitive — lap count matches planned reps
        }

        // Lap count matches reps + 1 or 2 (e.g. Garmin auto-laps WU/CD as extra laps)
        if (plannedSession.intervals) {
          const { reps } = plannedSession.intervals;
          if (laps.length >= reps && laps.length <= reps + 2 && lapVariance > 30) {
            return 'intervals';
          }
        }

        // Large pace swing across laps even without exact rep match
        if (lapVariance > 45) return 'intervals';
      }
    }

    // ── 2. km-split fallback (blunt but works for single-file uploads) ────
    if (splitsFormatted.length >= 2) {
      const paces = splitsFormatted.map(s => paceToSecs(s.pace)).filter(Boolean);
      if (paces.length >= 2) {
        const fastest = Math.min(...paces);
        const slowest = Math.max(...paces);
        if (slowest - fastest > 45) return 'intervals';
        if (fastest < 270) return 'tempo';
      }
    }

    return 'intervals'; // plan says hard — default to intervals rather than unknown
  }

  if (plannedSession.dot === 'moderate') return 'tempo';
  if (plannedSession.dot === 'easy')     return 'easy';
  return null;
}

// ── CONSECUTIVE-UPLOAD GROUPING ───────────────────────────────────────────────
//
// When you upload warm-up / intervals / cool-down as separate Strava activities,
// each lands in Supabase as its own row. This function finds sibling uploads that
// belong to the same planned session slot (same week+day) and whose start times
// are within GROUP_WINDOW_MINUTES of each other, then returns merged totals so
// the analysis reflects the whole session.
//
// The individual rows are kept intact in Supabase (we never delete them).
// We just compute a logical combined view for the analysis fields written back
// to the PRIMARY activity (the one with the hard/intervals laps).

const GROUP_WINDOW_MINUTES = 90;

async function fetchSiblingActivities(supabaseUrl, serviceKey, weekNum, dayName, currentStravaId, anchorStartEpoch) {
  // Query all activities on this calendar day ± window
  const windowStart = new Date((anchorStartEpoch - GROUP_WINDOW_MINUTES * 60) * 1000).toISOString();
  const windowEnd   = new Date((anchorStartEpoch + GROUP_WINDOW_MINUTES * 60) * 1000).toISOString();

  const url = `${supabaseUrl}/rest/v1/strava_activities`
    + `?select=strava_id,start_date,distance,moving_time,elapsed_time,average_heartrate,max_heartrate,calories,laps,splits_metric,session_type_detected`
    + `&start_date=gte.${windowStart}`
    + `&start_date=lte.${windowEnd}`
    + `&strava_id=neq.${currentStravaId}`
    + `&sport_type=eq.Run`;

  const res = await fetch(url, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    }
  });

  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

// ── MAIN FETCH + STORE ────────────────────────────────────────────────────────

async function fetchAndStore(stravaId, access_token) {
  // 1. Fetch detailed activity from Strava
  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const act = await actRes.json();
  if (!actRes.ok) throw new Error(`Strava fetch failed: ${act.message}`);

  // 2. Pace string
  const paceStr = parsePace(act.average_speed);

  // 3. km-splits
  const splitsFormatted = (act.splits_metric || []).map((sp, i) => ({
    km: i + 1,
    distance_m: Math.round(sp.distance),
    elapsed_s:  sp.elapsed_time,
    moving_s:   sp.moving_time,
    pace:       parsePace(sp.average_speed),
    hr:         sp.average_heartrate ? Math.round(sp.average_heartrate) : null,
    elevation:  sp.elevation_difference ? Math.round(sp.elevation_difference) : null,
  }));

  // 4. Laps — the primary signal for interval detection
  const laps = (act.laps || []).map((lap, i) => ({
    lap:        i + 1,
    distance_m: Math.round(lap.distance),
    elapsed_s:  lap.elapsed_time,
    moving_s:   lap.moving_time,
    pace:       parsePace(lap.average_speed),
    hr:         lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
    cadence:    lap.average_cadence   ? Math.round(lap.average_cadence)   : null,
  }));

  // 5. Best efforts
  const bestEfforts = (act.best_efforts || []).map(e => ({
    name:       e.name,
    distance_m: e.distance,
    elapsed_s:  e.elapsed_time,
    pace:       parsePace(e.average_speed),
    pr:         e.pr_rank === 1,
  }));

  // 6. Plan slot for this activity
  const actDate  = new Date(act.start_date);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayName  = dayNames[actDate.getDay()];
  const diffDays = Math.floor((actDate - PLAN_START) / 86400000);
  const weekNum  = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : null;

  const plannedSession = weekNum && weekPlan[weekNum] ? weekPlan[weekNum][dayName] : null;
  const actualKm       = (act.distance || 0) / 1000;

  // 7. Detect session type using laps first, splits second
  const sessionType = detectSessionType(plannedSession, laps, splitsFormatted);

  // 8. Check for sibling uploads (consecutive segments of one session)
  //    Only do this for hard sessions where fragmentation is common.
  let groupedKm          = actualKm;
  let groupedMovingTime  = act.moving_time || 0;
  let groupedMaxHR       = act.max_heartrate || 0;
  let groupedCalories    = act.calories || 0;
  let siblingCount       = 0;
  let isFragmented       = false;
  let fragmentNote       = '';

  if (plannedSession && plannedSession.dot === 'hard' && weekNum) {
    const anchorEpoch = Math.floor(actDate.getTime() / 1000);
    const siblings = await fetchSiblingActivities(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      weekNum,
      dayName,
      act.id,
      anchorEpoch
    );

    if (siblings.length > 0) {
      isFragmented  = true;
      siblingCount  = siblings.length;
      siblings.forEach(sib => {
        groupedKm         += parseFloat(sib.distance || 0);
        groupedMovingTime += parseInt(sib.moving_time || 0);
        groupedMaxHR       = Math.max(groupedMaxHR, sib.max_heartrate || 0);
        groupedCalories   += parseInt(sib.calories || 0);
      });
      fragmentNote = `Session split across ${siblingCount + 1} uploads — combined: ${groupedKm.toFixed(2)}km. `;
    }
  }

  // 9. Completion % — use grouped km for fragmented sessions
  let completionPct = null;
  if (plannedSession && plannedSession.km) {
    completionPct = Math.round(groupedKm / plannedSession.km * 100);
  }

  // 10. Build analysis notes
  const notes = [];
  if (fragmentNote) notes.push(fragmentNote);

  if (completionPct !== null) {
    const kmLabel = isFragmented ? `${groupedKm.toFixed(2)}km (combined)` : `${actualKm.toFixed(2)}km`;
    if (completionPct < 75)       notes.push(`Incomplete: ${kmLabel} of ${plannedSession.km}km planned (${completionPct}%).`);
    else if (completionPct < 90)  notes.push(`Slightly short: ${kmLabel} of ${plannedSession.km}km planned (${completionPct}%).`);
    else                          notes.push(`Distance complete: ${kmLabel} of ${plannedSession.km}km planned.`);
  }

  // ── Interval analysis — uses laps when available ──────────────────────────
  if (sessionType === 'intervals' && plannedSession.intervals) {
    const { reps, dist, targetPace } = plannedSession.intervals;
    const targetSecs = paceToSecs(targetPace);

    if (laps.length >= 2) {
      // Lap-based analysis: find which laps are the effort laps vs recovery
      // Effort laps are shorter in time-per-metre (faster) than median
      const lapPaceSecs = laps.map(l => paceToSecs(l.pace)).filter(Boolean);
      const sorted      = [...lapPaceSecs].sort((a, b) => a - b);
      const median      = sorted[Math.floor(sorted.length / 2)];

      // Effort laps = faster than median by >15s/km
      const effortLaps = laps.filter(l => {
        const s = paceToSecs(l.pace);
        return s !== null && s < median - 15;
      });

      // Pace stats across effort laps
      const effortPaces = effortLaps.map(l => paceToSecs(l.pace)).filter(Boolean);
      const avgEffortSecs = effortPaces.length
        ? Math.round(effortPaces.reduce((a, b) => a + b, 0) / effortPaces.length)
        : null;
      const avgEffortStr = avgEffortSecs
        ? `${Math.floor(avgEffortSecs / 60)}:${String(avgEffortSecs % 60).padStart(2, '0')}`
        : null;

      const fasterThanTarget = avgEffortSecs !== null && avgEffortSecs < targetSecs;
      const diffSecs         = avgEffortSecs !== null ? targetSecs - avgEffortSecs : null;

      notes.push(
        `Intervals (lap-based): ${effortLaps.length} effort lap(s) detected vs ${reps} planned.`
        + (avgEffortStr ? ` Avg effort pace: ${avgEffortStr}/km (target: ${targetPace}/km).` : '')
        + (diffSecs !== null && fasterThanTarget ? ` Running ${diffSecs}s/km ahead of target — consider adjusting target pace upward.` : '')
        + (diffSecs !== null && !fasterThanTarget && Math.abs(diffSecs) <= 10 ? ' On target.' : '')
        + (diffSecs !== null && avgEffortSecs > targetSecs ? ` ${Math.abs(diffSecs)}s/km slower than target.` : '')
      );

      // Fade check across effort laps
      if (effortLaps.length >= 3) {
        const half       = Math.floor(effortLaps.length / 2);
        const firstPaces = effortLaps.slice(0, half).map(l => paceToSecs(l.pace)).filter(Boolean);
        const lastPaces  = effortLaps.slice(half).map(l => paceToSecs(l.pace)).filter(Boolean);
        const avgFirst   = firstPaces.reduce((a, b) => a + b, 0) / firstPaces.length;
        const avgLast    = lastPaces.reduce((a, b) => a + b, 0) / lastPaces.length;
        if (avgLast - avgFirst > 10) {
          notes.push(`Pace fade: last ${lastPaces.length} effort(s) averaged ${Math.round(avgLast - avgFirst)}s/km slower than first ${firstPaces.length}.`);
        } else if (avgFirst - avgLast > 10) {
          notes.push(`Negative split pattern: effort pace improved across the session.`);
        }
      }
    } else {
      // No lap data — fall back to km-split analysis
      const fastSplits = splitsFormatted.filter(s => {
        const secs = paceToSecs(s.pace);
        return secs !== null && secs <= targetSecs + 30;
      });
      const onTargetSplits = fastSplits.filter(s => paceToSecs(s.pace) <= targetSecs + 10);
      notes.push(`Intervals (split-based, no lap data): ${fastSplits.length} fast km-splits vs ${reps} planned reps. ${onTargetSplits.length} hit target pace (${targetPace}/km).`);
    }
  }

  // ── Tempo analysis ────────────────────────────────────────────────────────
  if (sessionType === 'tempo' && plannedSession.tempo) {
    const { duration_min, targetPace } = plannedSession.tempo;
    const targetSecs  = paceToSecs(targetPace);
    const tempoSplits = splitsFormatted.filter(s => {
      const secs = paceToSecs(s.pace);
      return secs !== null && secs <= targetSecs + 20;
    });
    notes.push(`Tempo: ${tempoSplits.length} km-splits at or near target pace (${targetPace}/km). Planned ~${Math.round(duration_min)} min effort.`);
  }

  // ── HR note ───────────────────────────────────────────────────────────────
  if (act.average_heartrate) {
    const hr = Math.round(act.average_heartrate);
    if (plannedSession?.dot === 'easy' && hr > 155) {
      notes.push(`HR elevated for easy run (${hr}bpm avg) — consider slowing down.`);
    } else if (plannedSession?.dot === 'hard' && hr > 170) {
      notes.push(`HR ${hr}bpm avg — normal for intervals.`);
    } else {
      notes.push(`Avg HR: ${hr}bpm.`);
    }
  }

  const autoAnalysis = notes.join(' ') || null;

  // 11. Upsert into Supabase
  const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_activities?on_conflict=strava_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Prefer':        'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      strava_id:            act.id,
      name:                 act.name,
      description:          act.description || null,
      sport_type:           act.sport_type,
      workout_type:         act.workout_type ?? null,
      start_date:           act.start_date,
      start_date_local:     act.start_date_local,
      distance:             parseFloat(actualKm.toFixed(2)),
      elapsed_time:         act.elapsed_time,
      moving_time:          act.moving_time,
      average_speed:        act.average_speed,
      pace:                 paceStr,
      max_speed:            act.max_speed || 0,
      average_heartrate:    act.average_heartrate || null,
      max_heartrate:        act.max_heartrate || null,
      total_elevation_gain: act.total_elevation_gain || 0,
      average_cadence:      act.average_cadence || null,
      average_temp:         act.average_temp ?? null,
      calories:             act.calories || null,
      suffer_score:         act.suffer_score || null,
      perceived_exertion:   act.perceived_exertion || null,
      pr_count:             act.pr_count || 0,
      achievement_count:    act.achievement_count || 0,
      gear_id:              act.gear_id || null,
      gear_name:            act.gear?.name || null,
      splits_metric:        splitsFormatted.length ? splitsFormatted : null,
      laps:                 laps.length ? laps : null,
      best_efforts:         bestEfforts.length ? bestEfforts : null,
      auto_analysis:        autoAnalysis,
      completion_pct:       completionPct,
      session_type_detected: sessionType,
      // Extra fields written for fragmented sessions — useful for coach context
      grouped_km:           isFragmented ? parseFloat(groupedKm.toFixed(2)) : null,
      grouped_moving_time:  isFragmented ? groupedMovingTime : null,
      is_fragmented:        isFragmented || null,
      fragment_count:       isFragmented ? siblingCount + 1 : null,
    })
  });

  if (!sbRes.ok) {
    const sbText = await sbRes.text();
    throw new Error(`Supabase upsert failed: ${sbRes.status} ${sbText}`);
  }

  return { activity_id: act.id, analysis: autoAnalysis, session_type: sessionType };
}

// ── TOKEN REFRESH ─────────────────────────────────────────────────────────────

async function getStravaToken() {
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type:    'refresh_token'
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // GET: Strava hub verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    const verify    = req.query['hub.verify_token'];
    if (verify !== process.env.STRAVA_VERIFY_TOKEN) return res.status(403).json({ error: 'Forbidden' });
    return res.status(200).json({ 'hub.challenge': challenge });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body;
  if (event.object_type !== 'activity') return res.status(200).json({ status: 'ignored' });
  if (event.aspect_type !== 'create' && event.aspect_type !== 'update') {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const access_token = await getStravaToken();
    const result       = await fetchAndStore(event.object_id, access_token);
    res.status(200).json({ status: 'synced', ...result });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports.fetchAndStore  = fetchAndStore;
module.exports.getStravaToken = getStravaToken;
