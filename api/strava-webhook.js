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

function secsToStr(secs) {
  if (!secs) return null;
  return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}`;
}

// ── PLAN MIRROR ───────────────────────────────────────────────────────────────
const PLAN_START = new Date('2026-04-27');

const weekPlan = {
  1:  { Mon:{dot:'easy',type:'Easy Run',km:5},   Tue:{dot:'easy',type:'Easy Run',km:6},   Sat:{dot:'easy',type:'Long Run',km:10} },
  2:  { Mon:{dot:'easy',type:'Strides',km:7},    Tue:{dot:'easy',type:'Easy Run',km:7},   Sat:{dot:'easy',type:'Long Run',km:12} },
  3:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:8,  dist:400,  targetPace:'4:10'}}, Tue:{dot:'easy',type:'Easy Run',km:8},  Wed:{dot:'moderate',type:'Tempo',km:7,tempo:{duration_min:12,targetPace:'4:25'}}, Thu:{dot:'strength',type:'Strength'}, Sat:{dot:'easy',type:'Long Run',km:13} },
  4:  { Mon:{dot:'easy',type:'Strides',km:7},    Tue:{dot:'easy',type:'Easy Run',km:6},   Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:10,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:11} },
  5:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:6,  dist:1000, targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:9},  Wed:{dot:'moderate',type:'Threshold',km:8,tempo:{duration_min:20,targetPace:'4:25'}}, Thu:{dot:'strength',type:'Strength'}, Fri:{dot:'moderate',type:'Threshold',km:9,tempo:{duration_min:24,targetPace:'4:22'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
  6:  { Mon:{dot:'hard',type:'Intervals',km:10,intervals:{reps:5,  dist:1200, targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:16} },
  7:  { Mon:{dot:'hard',type:'Intervals',km:8,  intervals:{reps:10, dist:400,  targetPace:'3:58'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:10,tempo:{duration_min:30,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
  8:  { Mon:{dot:'hard',type:'Intervals',km:9,  intervals:{reps:6,  dist:800,  targetPace:'4:12'}}, Tue:{dot:'easy',type:'Easy Run',km:8},  Sat:{dot:'easy',type:'Long Run',km:13} },
  9:  { Mon:{dot:'hard',type:'Intervals',km:12, intervals:{reps:4,  dist:2000, targetPace:'4:10'}}, Tue:{dot:'easy',type:'Easy Run',km:11}, Thu:{dot:'moderate',type:'Tempo',km:11,tempo:{duration_min:35,targetPace:'4:25'}}, Sat:{dot:'moderate',type:'Long Run',km:18} },
  10: { Mon:{dot:'hard',type:'Race Pace',km:11, intervals:{reps:3,  dist:3000, targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Thu:{dot:'moderate',type:'Tempo',km:9,tempo:{duration_min:25,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Long Run',km:17} },
  11: { Mon:{dot:'hard',type:'Intervals',km:8,  intervals:{reps:12, dist:400,  targetPace:'3:55'}}, Tue:{dot:'easy',type:'Easy Run',km:10}, Sat:{dot:'race',type:'Race Simulation',km:12} },
  12: { Mon:{dot:'hard',type:'Intervals',km:6,  intervals:{reps:6,  dist:600,  targetPace:'4:11'}}, Tue:{dot:'easy',type:'Easy Run',km:7},  Thu:{dot:'moderate',type:'Tempo',km:6,tempo:{duration_min:12,targetPace:'4:25'}}, Sat:{dot:'easy',type:'Easy Run',km:9} },
  13: { Mon:{dot:'easy',type:'Easy Run',km:5},  Tue:{dot:'easy',type:'Shakeout',km:4}, Thu:{dot:'easy',type:'Shakeout',km:3}, Sat:{dot:'race',type:'RACE DAY',km:12} },
};

// ── REP EXTRACTION ────────────────────────────────────────────────────────────
//
// This is the core of the "did I hit my reps" question.
//
// Strava gives us THREE data sources, each with different fidelity:
//
// 1. act.laps  — Watch-defined laps. If you ran a structured Garmin workout
//    (or pressed lap between reps), each rep is its own lap object with exact
//    distance, time, pace, HR. This is the gold standard. Distance_m will be
//    close to planned rep distance (e.g. ~800m for 800m reps).
//
// 2. act.splits_metric — Automatic 1km splits. Always 1km boundaries, always
//    present. Useless for sub-km reps on their own, but fast km-splits during
//    an intervals run indicate effort sections.
//
// 3. act.best_efforts — Strava's own PR detector. Includes fastest 400m, 1/2
//    mile, 1km, 1 mile etc. within the run. Useful for confirming rep pace
//    even without lap data.
//
// Strategy:
//   A. If laps exist AND their distances cluster around the planned rep distance
//      (within 20%) → use laps directly as reps. Most reliable.
//   B. If laps exist but are 1km auto-laps → fall back to best_efforts for
//      rep-distance pace, km-splits for effort/recovery pattern.
//   C. No useful laps → infer from km-splits: fast splits = effort, slow = recovery.

function extractReps(laps, splitsFormatted, bestEfforts, plannedRepDist) {
  // ── Strategy A: lap distances match planned rep distance ──────────────────
  if (laps && laps.length >= 2) {
    const repDistLaps = laps.filter(l => {
      if (!l.distance_m || !plannedRepDist) return false;
      const ratio = Math.abs(l.distance_m - plannedRepDist) / plannedRepDist;
      return ratio < 0.25; // within 25% of planned rep distance
    });

    if (repDistLaps.length >= 2) {
      return {
        source: 'laps',
        reps: repDistLaps.map(l => ({
          distance_m: l.distance_m,
          pace:       l.pace,
          pace_secs:  paceToSecs(l.pace),
          hr:         l.hr,
          elapsed_s:  l.elapsed_s,
        }))
      };
    }

    // Laps exist but don't match rep distance — try median-split effort detection
    const lapPaceSecs = laps.map(l => paceToSecs(l.pace)).filter(Boolean);
    if (lapPaceSecs.length >= 4) {
      const sorted = [...lapPaceSecs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const effortLaps = laps.filter(l => paceToSecs(l.pace) < median - 20);
      if (effortLaps.length >= 2) {
        return {
          source: 'laps_inferred',
          reps: effortLaps.map(l => ({
            distance_m: l.distance_m,
            pace:       l.pace,
            pace_secs:  paceToSecs(l.pace),
            hr:         l.hr,
            elapsed_s:  l.elapsed_s,
          }))
        };
      }
    }
  }

  // ── Strategy B: best_efforts for pace at rep distance ─────────────────────
  if (bestEfforts && bestEfforts.length && plannedRepDist) {
    // Find the best effort closest to planned rep distance
    const closestEffort = bestEfforts
      .filter(e => e.distance_m && Math.abs(e.distance_m - plannedRepDist) / plannedRepDist < 0.3)
      .sort((a, b) => Math.abs(a.distance_m - plannedRepDist) - Math.abs(b.distance_m - plannedRepDist))[0];

    if (closestEffort) {
      return {
        source: 'best_effort',
        bestEffortPace: closestEffort.pace,
        bestEffortPaceSecs: paceToSecs(closestEffort.pace),
        bestEffortDist: closestEffort.distance_m,
        reps: [] // can't enumerate individual reps from best_efforts
      };
    }
  }

  // ── Strategy C: km-split inference ────────────────────────────────────────
  if (splitsFormatted && splitsFormatted.length >= 3) {
    const splitPaceSecs = splitsFormatted.map(s => paceToSecs(s.pace)).filter(Boolean);
    const sorted = [...splitPaceSecs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const fastSplits = splitsFormatted.filter(s => paceToSecs(s.pace) < median - 20);

    if (fastSplits.length >= 1) {
      return {
        source: 'splits_inferred',
        reps: fastSplits.map(s => ({
          distance_m: 1000,
          pace:       s.pace,
          pace_secs:  paceToSecs(s.pace),
          hr:         s.hr,
          elapsed_s:  s.moving_s,
        }))
      };
    }
  }

  return { source: 'none', reps: [] };
}

// ── SESSION TYPE DETECTION ────────────────────────────────────────────────────
function detectSessionType(plannedSession, laps, splitsFormatted) {
  if (!plannedSession) return null;

  if (plannedSession.dot === 'hard') {
    if (laps.length >= 2) {
      const lapPaceSecs = laps.map(l => paceToSecs(l.pace)).filter(Boolean);
      if (lapPaceSecs.length >= 2) {
        const fastest = Math.min(...lapPaceSecs);
        const slowest = Math.max(...lapPaceSecs);
        const lapVariance = slowest - fastest;

        if (plannedSession.intervals && laps.length === plannedSession.intervals.reps) return 'intervals';
        if (plannedSession.intervals) {
          const { reps } = plannedSession.intervals;
          if (laps.length >= reps && laps.length <= reps + 2 && lapVariance > 30) return 'intervals';
        }
        if (lapVariance > 45) return 'intervals';
      }
    }

    if (splitsFormatted.length >= 2) {
      const paces = splitsFormatted.map(s => paceToSecs(s.pace)).filter(Boolean);
      if (paces.length >= 2) {
        const fastest = Math.min(...paces);
        const slowest = Math.max(...paces);
        if (slowest - fastest > 45) return 'intervals';
        if (fastest < 270) return 'tempo';
      }
    }
    return 'intervals';
  }

  if (plannedSession.dot === 'moderate') return 'tempo';
  if (plannedSession.dot === 'easy')     return 'easy';
  return null;
}

// ── PACE FEEDBACK ─────────────────────────────────────────────────────────────
// Computes structured feedback comparing actual effort pace to planned target.
// Returns a feedback object the frontend can render as a badge + coach note.
//
// effort_pace_secs:    actual avg pace across effort reps (seconds/km)
// target_pace_secs:   planned target pace (seconds/km)
// diff_secs:          positive = faster than target, negative = slower
// verdict:            'faster' | 'on_target' | 'slower' | 'unknown'
// next_suggestion:    what to adjust next time

function buildPaceFeedback(sessionType, repData, plannedSession, laps, splitsFormatted) {
  const result = {
    effort_pace_secs:  null,
    target_pace_secs:  null,
    diff_secs:         null,
    verdict:           'unknown',
    rep_count_planned: null,
    rep_count_actual:  null,
    rep_paces:         [],
    data_source:       'none',
    next_suggestion:   null,
    coach_note:        null,
  };

  // ── Intervals ──────────────────────────────────────────────────────────────
  if (sessionType === 'intervals' && plannedSession.intervals) {
    const { reps, dist, targetPace } = plannedSession.intervals;
    result.target_pace_secs  = paceToSecs(targetPace);
    result.rep_count_planned = reps;
    result.data_source       = repData.source;

    if (repData.source === 'best_effort') {
      result.effort_pace_secs = repData.bestEffortPaceSecs;
      result.rep_count_actual = null; // can't count from best_effort
    } else if (repData.reps.length > 0) {
      const paces = repData.reps.map(r => r.pace_secs).filter(Boolean);
      result.effort_pace_secs = paces.length
        ? Math.round(paces.reduce((a, b) => a + b, 0) / paces.length)
        : null;
      result.rep_count_actual = repData.reps.length;
      result.rep_paces = repData.reps.map(r => r.pace).filter(Boolean);
    }

    if (result.effort_pace_secs && result.target_pace_secs) {
      result.diff_secs = result.target_pace_secs - result.effort_pace_secs; // positive = faster
      const margin = Math.abs(result.diff_secs);

      if (result.diff_secs > 8) {
        result.verdict = 'faster';
        result.next_suggestion = margin > 20
          ? `Consider moving target to ${secsToStr(result.effort_pace_secs - 3)}/km — you have a higher ceiling.`
          : `You're slightly ahead of target. Maintain ${targetPace}/km next session and see if you can hold consistency.`;
        result.coach_note = `You ran ${margin}s/km faster than the ${targetPace}/km target. ${result.next_suggestion}`;
      } else if (result.diff_secs < -8) {
        result.verdict = 'slower';
        result.next_suggestion = margin > 20
          ? `Consider dropping target to ${secsToStr(result.target_pace_secs + 5)}/km to hit full reps with better form.`
          : `Marginally over target — this can be normal on tired legs. Keep ${targetPace}/km target and monitor recovery.`;
        result.coach_note = `You ran ${margin}s/km slower than the ${targetPace}/km target. ${result.next_suggestion}`;
      } else {
        result.verdict = 'on_target';
        result.coach_note = `Spot on — ${secsToStr(result.effort_pace_secs)}/km average effort across ${result.rep_count_actual || reps} reps, right on the ${targetPace}/km target.`;
      }
    }

    // Fade analysis across individual reps
    if (repData.reps.length >= 4) {
      const half = Math.floor(repData.reps.length / 2);
      const firstHalf = repData.reps.slice(0, half).map(r => r.pace_secs).filter(Boolean);
      const lastHalf  = repData.reps.slice(half).map(r => r.pace_secs).filter(Boolean);
      if (firstHalf.length && lastHalf.length) {
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgLast  = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;
        const fade = avgLast - avgFirst;
        if (fade > 12) {
          result.coach_note += ` Note: pace faded ${Math.round(fade)}s/km across the session — may need more recovery between reps or slightly lower target.`;
        } else if (fade < -12) {
          result.coach_note += ` Strong negative split — you got faster as you warmed up. Good sign of controlled pacing.`;
        }
      }
    }
  }

  // ── Tempo / Threshold ──────────────────────────────────────────────────────
  if (sessionType === 'tempo' && plannedSession.tempo) {
    const { targetPace, duration_min } = plannedSession.tempo;
    result.target_pace_secs = paceToSecs(targetPace);
    result.data_source = 'splits';

    // Tempo effort = splits faster than target + 25s buffer
    const effortSplits = splitsFormatted.filter(s => {
      const secs = paceToSecs(s.pace);
      return secs && secs <= result.target_pace_secs + 25;
    });

    if (effortSplits.length > 0) {
      const paces = effortSplits.map(s => paceToSecs(s.pace)).filter(Boolean);
      result.effort_pace_secs = Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
      result.diff_secs = result.target_pace_secs - result.effort_pace_secs;
      const margin = Math.abs(result.diff_secs);

      if (result.diff_secs > 8) {
        result.verdict = 'faster';
        result.coach_note = `Tempo effort averaged ${secsToStr(result.effort_pace_secs)}/km — ${margin}s/km faster than ${targetPace}/km target. ${margin > 15 ? 'Consider nudging threshold target pace down next session.' : 'Solid execution — maintain this target.'}`;
      } else if (result.diff_secs < -8) {
        result.verdict = 'slower';
        result.coach_note = `Tempo effort averaged ${secsToStr(result.effort_pace_secs)}/km — ${margin}s/km slower than ${targetPace}/km target. ${margin > 15 ? 'May have been a tough day — check fatigue and adjust next threshold session if needed.' : 'Marginal miss — keep the target and try again.'}`;
      } else {
        result.verdict = 'on_target';
        result.coach_note = `Threshold effort averaged ${secsToStr(result.effort_pace_secs)}/km — right on ${targetPace}/km target. ${effortSplits.length} km at tempo effort.`;
      }
    }
  }

  // ── Easy runs ─────────────────────────────────────────────────────────────
  if (sessionType === 'easy') {
    const avgPace = laps.length > 0
      ? Math.round(laps.map(l => paceToSecs(l.pace)).filter(Boolean).reduce((a, b) => a + b, 0) / laps.length)
      : null;
    result.effort_pace_secs = avgPace;
    result.target_pace_secs = paceToSecs('5:45'); // Z2 upper bound
    if (avgPace) {
      if (avgPace < 300) { // faster than 5:00/km
        result.verdict = 'faster';
        result.coach_note = `Easy run pace ${secsToStr(avgPace)}/km — too fast for Z2. Aim for 5:30–6:00/km to keep aerobic stimulus without accumulating fatigue.`;
      } else if (avgPace <= 360) {
        result.verdict = 'on_target';
        result.coach_note = `Easy run at ${secsToStr(avgPace)}/km — solid Z2 effort.`;
      } else {
        result.verdict = 'on_target'; // slow is fine for easy
        result.coach_note = `Easy run at ${secsToStr(avgPace)}/km — very relaxed. Fine for recovery days.`;
      }
    }
  }

  return result;
}

// ── CONSECUTIVE-UPLOAD GROUPING ───────────────────────────────────────────────
const GROUP_WINDOW_MINUTES = 90;

async function fetchSiblingActivities(supabaseUrl, serviceKey, currentStravaId, anchorStartEpoch) {
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
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    }
  });

  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

// ── MAIN FETCH + STORE ────────────────────────────────────────────────────────
async function fetchAndStore(stravaId, access_token) {
  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const act = await actRes.json();
  if (!actRes.ok) throw new Error(`Strava fetch failed: ${act.message}`);

  const paceStr = parsePace(act.average_speed);

  const splitsFormatted = (act.splits_metric || []).map((sp, i) => ({
    km:         i + 1,
    distance_m: Math.round(sp.distance),
    elapsed_s:  sp.elapsed_time,
    moving_s:   sp.moving_time,
    pace:       parsePace(sp.average_speed),
    hr:         sp.average_heartrate ? Math.round(sp.average_heartrate) : null,
    elevation:  sp.elevation_difference ? Math.round(sp.elevation_difference) : null,
  }));

  const laps = (act.laps || []).map((lap, i) => ({
    lap:        i + 1,
    distance_m: Math.round(lap.distance),
    elapsed_s:  lap.elapsed_time,
    moving_s:   lap.moving_time,
    pace:       parsePace(lap.average_speed),
    hr:         lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
    cadence:    lap.average_cadence   ? Math.round(lap.average_cadence)   : null,
  }));

  const bestEfforts = (act.best_efforts || []).map(e => ({
    name:       e.name,
    distance_m: e.distance,
    elapsed_s:  e.elapsed_time,
    pace:       parsePace(e.average_speed),
    pace_secs:  paceToSecs(parsePace(e.average_speed)),
    pr:         e.pr_rank === 1,
  }));

  // Plan slot — flexible matching mirrors app.js buildActivityIndex logic.
  // A run on a Strength day (or any day that doesn't match its session type by
  // distance/type) is scored against every unclaimed run slot in the week so
  // the webhook generates correct feedback even when the athlete ran on the
  // "wrong" day.
  const actDate      = new Date(act.start_date_local || act.start_date);
  const dayNames     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayName      = dayNames[actDate.getDay()];
  const diffDays     = Math.floor((actDate - PLAN_START) / 86400000);
  const weekNum      = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : null;
  const actualKm     = (act.distance || 0) / 1000;
  const weekSessions = weekNum && weekPlan[weekNum] ? weekPlan[weekNum] : {};
  const dayOrder     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Score an activity against a candidate plan slot (same logic as frontend scoreMatch)
  const scoreSession = (candidateDay, session) => {
    const targetKm = session.km || 0;
    let score = 0;
    // Distance proximity (0–6 pts)
    if (targetKm && actualKm > 0) {
      const ratio = Math.abs(actualKm - targetKm) / targetKm;
      if      (ratio < 0.10) score += 6;
      else if (ratio < 0.20) score += 4;
      else if (ratio < 0.35) score += 2;
      else if (ratio < 0.55) score += 1;
    }
    // Day proximity (0–3 pts)
    const actIdx  = dayOrder.indexOf(dayName);
    const planIdx = dayOrder.indexOf(candidateDay);
    const dayDiff = Math.abs(actIdx - planIdx);
    if      (dayDiff === 0) score += 3;
    else if (dayDiff === 1) score += 2;
    else if (dayDiff === 2) score += 1;
    return score;
  }

  // Find best matching session across the whole week
  let plannedSession  = null;
  let matchedDay      = dayName;
  let bestScore       = -1;

  // First try exact day if it's a run session (not strength/rest)
  const exactSession = weekSessions[dayName];
  if (exactSession && exactSession.dot !== 'rest' && exactSession.dot !== 'strength') {
    const targetKm = exactSession.km || 0;
    const isFragment = targetKm > 0 && actualKm < targetKm * 0.4;
    // Detect type conflict: if laps/splits strongly suggest intervals but exact day
    // is an easy session, don't lock in score 99 — let scoring find the right slot.
    const detectedHard = (() => {
      const lapPaces = (laps || []).map(l => paceToSecs(l.pace)).filter(Boolean);
      if (lapPaces.length >= 4) {
        const sorted = [...lapPaces].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const fastLaps = lapPaces.filter(p => p < median - 25);
        if (fastLaps.length >= 2) return true;
      }
      const splitPaces = (splitsFormatted || []).map(s => paceToSecs(s.pace)).filter(Boolean);
      if (splitPaces.length >= 4) {
        const sorted = [...splitPaces].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const fastSplits = splitPaces.filter(p => p < median - 25);
        if (fastSplits.length >= 2) return true;
      }
      return false;
    })();
    const typeConflict = detectedHard && exactSession.dot === 'easy';
    if (!isFragment && !typeConflict) {
      plannedSession = exactSession;
      matchedDay     = dayName;
      bestScore      = 99; // exact day wins unless it's clearly wrong
    }
  }

  // If exact day is Strength/Rest, fragment, or type-conflict — score all run slots
  if (!plannedSession || bestScore < 99) {
    dayOrder.forEach(day => {
      const session = weekSessions[day];
      if (!session || session.dot === 'rest' || session.dot === 'strength') return;
      const s = scoreSession(day, session);
      if (s > bestScore) { bestScore = s; plannedSession = session; matchedDay = day; }
    });
  }

  const sessionType = detectSessionType(plannedSession, laps, splitsFormatted);

  // Rep extraction
  const plannedRepDist = plannedSession?.intervals?.dist || null;
  const repData = extractReps(laps, splitsFormatted, bestEfforts, plannedRepDist);

  // Pace feedback
  const paceFeedback = buildPaceFeedback(sessionType, repData, plannedSession || {}, laps, splitsFormatted);

  // Fragmented session check
  let groupedKm         = actualKm;
  let groupedMovingTime = act.moving_time || 0;
  let groupedMaxHR      = act.max_heartrate || 0;
  let groupedCalories   = act.calories || 0;
  let siblingCount      = 0;
  let isFragmented      = false;

  if (plannedSession && plannedSession.dot === 'hard' && weekNum) {
    const anchorEpoch = Math.floor(actDate.getTime() / 1000);
    const siblings = await fetchSiblingActivities(
      process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
      act.id, anchorEpoch
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
    }
  }

  let completionPct = null;
  if (plannedSession && plannedSession.km) {
    completionPct = Math.round(groupedKm / plannedSession.km * 100);
  }

  // ── Build auto_analysis ───────────────────────────────────────────────────
  const notes = [];

  if (isFragmented) {
    notes.push(`Session split across ${siblingCount + 1} uploads — combined ${groupedKm.toFixed(2)}km.`);
  }

  if (completionPct !== null) {
    const kmLabel = isFragmented ? `${groupedKm.toFixed(2)}km (combined)` : `${actualKm.toFixed(2)}km`;
    if (completionPct < 75)      notes.push(`Incomplete: ${kmLabel} of ${plannedSession.km}km planned (${completionPct}%).`);
    else if (completionPct < 90) notes.push(`Slightly short: ${kmLabel} of ${plannedSession.km}km planned (${completionPct}%).`);
    else                         notes.push(`Distance complete: ${kmLabel} of ${plannedSession.km}km planned.`);
  }

  // Rep / effort data source note (important for the user to understand confidence)
  if (sessionType === 'intervals') {
    const sourceLabel = {
      laps:            `✓ Lap data (${repData.reps.length} reps detected from watch laps)`,
      laps_inferred:   `~ Laps present but rep distance unclear — effort reps inferred`,
      best_effort:     `~ Best effort data used (no individual lap data)`,
      splits_inferred: `~ km-splits used — load structured workout on Garmin for accurate rep data`,
      none:            `✗ No rep data available`,
    }[repData.source] || '';
    if (sourceLabel) notes.push(sourceLabel);
  }

  if (paceFeedback.coach_note) notes.push(paceFeedback.coach_note);

  // HR note
  if (act.average_heartrate) {
    const hr = Math.round(act.average_heartrate);
    if (plannedSession?.dot === 'easy' && hr > 155) {
      notes.push(`HR elevated for easy run (${hr}bpm avg) — consider slowing down.`);
    } else if (plannedSession?.dot === 'hard') {
      notes.push(`Avg HR ${hr}bpm.`);
    } else {
      notes.push(`Avg HR ${hr}bpm.`);
    }
  }

  const autoAnalysis = notes.join(' ') || null;

  // Upsert
  const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/strava_activities?on_conflict=strava_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Prefer':        'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      strava_id:             act.id,
      name:                  act.name,
      description:           act.description || null,
      sport_type:            act.sport_type,
      workout_type:          act.workout_type ?? null,
      start_date:            act.start_date,
      start_date_local:      act.start_date_local,
      distance:              parseFloat(actualKm.toFixed(2)),
      elapsed_time:          act.elapsed_time,
      moving_time:           act.moving_time,
      average_speed:         act.average_speed,
      pace:                  paceStr,
      max_speed:             act.max_speed || 0,
      average_heartrate:     act.average_heartrate || null,
      max_heartrate:         act.max_heartrate || null,
      total_elevation_gain:  act.total_elevation_gain || 0,
      average_cadence:       act.average_cadence || null,
      average_temp:          act.average_temp ?? null,
      calories:              act.calories || null,
      suffer_score:          act.suffer_score || null,
      perceived_exertion:    act.perceived_exertion || null,
      pr_count:              act.pr_count || 0,
      achievement_count:     act.achievement_count || 0,
      gear_id:               act.gear_id || null,
      gear_name:             act.gear?.name || null,
      splits_metric:         splitsFormatted.length ? splitsFormatted : null,
      laps:                  laps.length ? laps : null,
      best_efforts:          bestEfforts.length ? bestEfforts : null,
      auto_analysis:         autoAnalysis,
      completion_pct:        completionPct,
      session_type_detected: sessionType,
      // Structured pace feedback — readable by app.js and the coach
      effort_pace_secs:      paceFeedback.effort_pace_secs,
      target_pace_secs:      paceFeedback.target_pace_secs,
      pace_diff_secs:        paceFeedback.diff_secs,
      pace_verdict:          paceFeedback.verdict,
      rep_count_planned:     paceFeedback.rep_count_planned,
      rep_count_actual:      paceFeedback.rep_count_actual,
      rep_paces:             paceFeedback.rep_paces.length ? paceFeedback.rep_paces : null,
      pace_data_source:      paceFeedback.data_source,
      grouped_km:            isFragmented ? parseFloat(groupedKm.toFixed(2)) : null,
      grouped_moving_time:   isFragmented ? groupedMovingTime : null,
      is_fragmented:         isFragmented || null,
      fragment_count:        isFragmented ? siblingCount + 1 : null,
    })
  });

  if (!sbRes.ok) {
    const sbText = await sbRes.text();
    throw new Error(`Supabase upsert failed: ${sbRes.status} ${sbText}`);
  }

  return { activity_id: act.id, analysis: autoAnalysis, session_type: sessionType, verdict: paceFeedback.verdict };
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
