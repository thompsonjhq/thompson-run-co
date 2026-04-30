// ── CONFIG ──
const SUPABASE_URL = 'https://zqnoahdhexjmtgfyczpz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxbm9haGRoZXhqbXRnZnljenB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTM4NjksImV4cCI6MjA5MjMyOTg2OX0.osTtLezghbBWXnOhN9PgAbD6O3L9fYuNezCBmsy2_Mc';

// ── SUPABASE HELPERS ──
async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  get: (table, params='') => sb(`${table}?${params}`),
  post: (table, body, prefer='resolution=merge-duplicates') => sb(table, { method:'POST', body: JSON.stringify(body), prefer }),
  patch: (table, match, body) => sb(`${table}?${match}`, { method:'PATCH', body: JSON.stringify(body) }),
  delete: (table, match) => sb(`${table}?${match}`, { method:'DELETE' })
};

// ── PLAN DATA ──
const PLAN_START = new Date(2026, 3, 27);
const RACE_DATE  = new Date(2026, 6, 19);

const weeks = [
  { num:1, phase:'base', label:'Return To Running', km:21, note:'Maintenance week transitioning into the plan. All easy aerobic running — no intervals, no tempo. Re-establish the habit, wake the legs up, introduce strength without digging a hole.', hamstring:true,
    days:{ Mon:{type:'Easy Run',detail:'5km easy Z2 · 5:50/km · genuinely conversational',dot:'easy'}, Tue:{type:'Rest',detail:'Full rest day — resist the urge to run',dot:'rest'}, Wed:{type:'Strength',detail:'40 min · RDL first + Nordics · 3×10 light',dot:'strength'}, Thu:{type:'Easy Run',detail:'6km easy Z2 · 5:45/km · relaxed',dot:'easy'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'10km easy Z2 · 5:50/km · flat route, no watch pressure',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:2, phase:'base', label:'Building The Habit', km:26, note:'+5km on week 1. Still no hard sessions — introduce strides on Thursday. Keep long run easy.', hamstring:true,
    days:{ Mon:{type:'Easy Run',detail:'7km easy Z2 · 5:45/km',dot:'easy'}, Tue:{type:'Rest',detail:'Full rest day',dot:'rest'}, Wed:{type:'Strength',detail:'40 min · RDL + Nordics · 3×10 · start adding light load',dot:'strength'}, Thu:{type:'Strides',detail:'7km easy + 6×80m strides · relaxed, not sprinting',dot:'easy'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'12km easy Z2 · 5:50/km · focus on time on feet',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:3, phase:'base', label:'First Quality Work', km:34, note:'First intervals of the plan — kept short and conservative. Tempo introduced at the lower end. Hamstring protocol active on all speed work.', hamstring:true,
    days:{ Mon:{type:'Easy Run',detail:'8km easy Z2 · 5:45/km',dot:'easy'}, Tue:{type:'Intervals',detail:'8×400m @ 4:10/km · 90s rest · 2km WU/CD · conservative pace',dot:'hard'}, Wed:{type:'Strength',detail:'45 min · RDL + Nordics priority · 3×10',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 12 min @ Z4 (4:25/km) · 2km CD · total ~7km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'13km easy Z2',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:4, phase:'base', label:'Deload — Consolidate', km:29, note:'Planned deload after 3 progressive weeks. Volume drops ~15%. Quality maintained but sessions shorter. Body adapts during recovery weeks.', hamstring:true,
    days:{ Mon:{type:'Easy Run',detail:'6km easy Z2 · full recovery feel',dot:'easy'}, Tue:{type:'Strides',detail:'7km easy + 6×100m strides · relaxed turnover',dot:'easy'}, Wed:{type:'Strength',detail:'40 min · reduced load, focus on form · 3×8',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 10 min @ Z4 · 2km CD · total ~6km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'11km easy Z2',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:5, phase:'build', label:'Threshold Introduction', km:40, note:'Phase 2 begins. A proper base is now under you. Longer intervals at race pace, longer tempo blocks. Resume full Z5b if hamstring soreness has resolved.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'9km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'6×1000m @ 10km RP (4:10–4:15) · 2 min rest · 2km WU/CD · total ~10km',dot:'hard'}, Wed:{type:'Strength',detail:'50 min · Phase 2 load · 4×8',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 20 min Z4 continuous · 2km CD · total ~8km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'15km easy Z2 + 2km Z3 finish · total 17km',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:6, phase:'build', label:'Volume Increase', km:44, note:'Longer intervals and tempo. Long run adds progression finish. Keep Monday genuinely easy.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'10km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'5×1200m @ 10km RP · 2.5 min rest · 2km WU/CD · total ~10km',dot:'hard'}, Wed:{type:'Strength',detail:'50 min · Progressive load · 3×8',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 2×15 min Z4 (3 min jog) · 2km CD · total ~9km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'16km · last 4km @ Z3 progression',dot:'moderate'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:7, phase:'build', label:'Aerobic Push', km:47, note:'Highest aerobic volume of the build. Thursday 30 min tempo is the key session — protect it.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'11km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'10×400m @ Z5b (3:58/km) · 75s rest · 2km WU/CD · total ~8km',dot:'hard'}, Wed:{type:'Strength',detail:'50 min · Heavy phase · 4×6–8',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 30 min Z4 continuous · 2km CD · total ~10km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'17km easy Z2',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:8, phase:'build', label:'Deload — Consolidate', km:37, note:'Second deload. Volume drops, two quality sessions maintained at shorter duration. Legs should feel fresher by Saturday.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'8km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'6×800m @ 10km RP · 90s rest · 2km WU/CD · total ~9km',dot:'hard'}, Wed:{type:'Strength',detail:'45 min · Reduced load, maintain form',dot:'strength'}, Thu:{type:'Easy Run',detail:'8km easy Z2 + 4×100m strides',dot:'easy'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'13km easy Z2',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:9, phase:'build', label:'Peak Volume', km:50, note:'Highest weekly volume in the plan. 4×2km at race pace is the centrepiece — all other sessions exist to enable that one.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'11km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'4×2000m @ 10km RP (4:10) · 3 min rest · 2km WU/CD · total ~12km',dot:'hard'}, Wed:{type:'Strength',detail:'55 min · Peak strength block · 4×6–8',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 35 min Z4 · 2km CD · total ~11km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'18km · last 5km @ Z3',dot:'moderate'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:10, phase:'peak', label:'Race-Specific Sharpening', km:46, note:'Volume slightly reduced, intensity at exact race pace. The 3×3km at race pace should feel controlled.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'10km easy Z2',dot:'easy'}, Tue:{type:'Race Pace',detail:'3×3km @ exact race pace (4:11/km) · 3 min rest · 2km WU/CD · total ~11km',dot:'hard'}, Wed:{type:'Strength',detail:'45 min · Maintain strength, reduce volume',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 25 min Z4 · 2km CD · total ~9km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Long Run',detail:'17km easy Z2',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:11, phase:'peak', label:'Race Simulation', km:44, note:'8km race simulation Saturday. Treat it like race day — warm up properly, execute the pace, don\'t blow up.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'10km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'12×400m @ Z5b (3:55/km) · 60s rest · 2km WU/CD · total ~8km',dot:'hard'}, Wed:{type:'Strength',detail:'40 min · Reduced intensity, keep form',dot:'strength'}, Thu:{type:'Easy Run',detail:'8km easy Z2 · fresh legs for Sat',dot:'easy'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Race Simulation',detail:'2km WU · 8km @ 4:10–4:12/km · 2km CD · total 12km',dot:'race'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:12, phase:'taper', label:'Freshen Up', km:30, note:'Volume drops 30–35%. Keep two quality sessions but shorten them. The fitness is banked — trust the taper.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'7km easy Z2',dot:'easy'}, Tue:{type:'Intervals',detail:'6×600m @ race pace · 2 min rest · 2km WU/CD · total ~6km',dot:'hard'}, Wed:{type:'Strength',detail:'25 min · Bodyweight + activation only',dot:'strength'}, Thu:{type:'Tempo',detail:'2km WU · 12 min Z4 · 2km CD · total ~6km',dot:'moderate'}, Fri:{type:'Rest',detail:'Full rest day',dot:'rest'}, Sat:{type:'Easy Run',detail:'9km easy Z2 · no long run',dot:'easy'}, Sun:{type:'Rest',detail:'',dot:'rest'} }},
  { num:13, phase:'taper', label:'Race Week', km:24, note:'19 July race day. Everything this week is activation. Short, sharp, easy. Sleep is your biggest performance lever.', hamstring:false,
    days:{ Mon:{type:'Easy Run',detail:'5km very easy Z1 · shake out legs',dot:'easy'}, Tue:{type:'Shakeout',detail:'4km easy + 4×100m race pace strides · feel sharp',dot:'easy'}, Wed:{type:'Rest',detail:'Full rest day',dot:'rest'}, Thu:{type:'Shakeout',detail:'3km easy + 4×100m strides · keep very short',dot:'easy'}, Fri:{type:'Rest',detail:'Prep kit, finalise nutrition plan, early night',dot:'rest'}, Sat:{type:'RACE DAY',detail:'10km · Target: sub-42:00 (4:11/km) · 2km WU · trust the training',dot:'race'}, Sun:{type:'Rest',detail:'',dot:'rest'} }}
];

const pillClass = { base:'pill-base', build:'pill-build', peak:'pill-peak', taper:'pill-taper' };
const phaseLabel = { base:'Base', build:'Build', peak:'Peak', taper:'Taper' };
const dayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── PLANNED DISTANCE HELPERS ──
// Single source of truth for planned weekly km.
// Prefer numeric session.distance_km if present; otherwise parse from session.detail.
function parseKmFromDetail(detail = '') {
  const text = String(detail || '');

  // Prefer explicit total, e.g. "total ~10km" or "total 12km"
  const totalMatch = text.match(/total\s*~?\s*(\d+(?:\.\d+)?)\s*km/i);
  if (totalMatch) return Number(totalMatch[1]);

  // Interval sessions, e.g. "8×400m @ 4:10/km · 90s standing rest · 2km WU/CD"
  const intervalMatch = text.match(/(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(m|km)\b/i);
  if (intervalMatch) {
    const reps = Number(intervalMatch[1]);
    const repDistance = Number(intervalMatch[2]);
    const unit = intervalMatch[3].toLowerCase();

    const repKm = unit === 'm' ? repDistance / 1000 : repDistance;
    const workKm = reps * repKm;

    // "2km WU/CD" means 2km warm-up + 2km cool-down.
    const combinedWarmCoolMatch = text.match(/(\d+(?:\.\d+)?)\s*km\s*WU\/CD/i);
    const warmCoolKm = combinedWarmCoolMatch ? Number(combinedWarmCoolMatch[1]) * 2 : 0;

    // Or separately: "2km WU ... 2km CD"
    const warmupMatch = text.match(/(\d+(?:\.\d+)?)\s*km\s*WU/i);
    const cooldownMatch = text.match(/(\d+(?:\.\d+)?)\s*km\s*CD/i);

    const separateWarmCoolKm =
      (warmupMatch ? Number(warmupMatch[1]) : 0) +
      (cooldownMatch ? Number(cooldownMatch[1]) : 0);

    let recoveryKm = 0;
    const recoveries = Math.max(0, reps - 1);

    const isStandingRest = /standing\s+rest|walk\s+back|full\s+rest/i.test(text);
    const isActiveRecovery = /jog|active|float|shuffle|recovery/i.test(text);

    // Distance-based recovery, e.g. "200m jog recovery" or "0.2km recovery"
    const recoveryDistanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|km)\s*(?:jog|active|float|shuffle)?\s*(?:recovery|recoveries|rec|rest)/i);

    if (!isStandingRest && recoveryDistanceMatch) {
      const recoveryDistance = Number(recoveryDistanceMatch[1]);
      const recoveryUnit = recoveryDistanceMatch[2].toLowerCase();
      const recoveryEachKm = recoveryUnit === 'm' ? recoveryDistance / 1000 : recoveryDistance;

      recoveryKm = recoveries * recoveryEachKm;
    }

    // Time-based active recovery, e.g. "90s jog" or "2 min jog recovery"
    if (!isStandingRest && recoveryKm === 0 && isActiveRecovery) {
      const secondsMatch = text.match(/(\d+)\s*s\s*(?:jog|active|float|shuffle|recovery)/i);
      const minutesMatch = text.match(/(\d+(?:\.\d+)?)\s*min\s*(?:jog|active|float|shuffle|recovery)/i);

      let recoverySeconds = 0;
      if (secondsMatch) recoverySeconds = Number(secondsMatch[1]);
      if (minutesMatch) recoverySeconds = Number(minutesMatch[1]) * 60;

      if (recoverySeconds > 0) {
        // Conservative recovery jog assumption: 7:30/km = 2.22 m/s
        const recoveryKmEach = (recoverySeconds * 2.22) / 1000;
        recoveryKm = recoveries * recoveryKmEach;
      }
    }

    const baseKm = workKm + (warmCoolKm || separateWarmCoolKm);

    return Number((baseKm + recoveryKm).toFixed(1));
  }

  // Tempo / race simulation style:
  // "2km WU · 8km @ 4:10/km · 2km CD"
  const kmMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*km\b/gi)]
    .map(match => Number(match[1]));

  if (kmMatches.length > 1) {
    return Number(kmMatches.reduce((sum, km) => sum + km, 0).toFixed(1));
  }

  if (kmMatches.length === 1) {
    return kmMatches[0];
  }

  return 0;
}

function getPlannedSessionKm(session) {
  if (!session) return 0;

  if (session.distance_km !== undefined && session.distance_km !== null) {
    return Number(session.distance_km) || 0;
  }

  if (session.dot === 'rest' || session.dot === 'strength') {
    return 0;
  }

  return parseKmFromDetail(session.detail);
}

function getPlannedWeekKm(week) {
  if (!week || !week.days) return 0;

  return dayOrder.reduce((sum, day) => {
    return sum + getPlannedSessionKm(week.days[day]);
  }, 0);
}

function getPlannedKmByWeek() {
  const totals = {};

  weeks.forEach(w => {
    totals[w.num] = getPlannedWeekKm(w);
  });

  return totals;
}

function formatPlannedSessionDetail(session) {
  if (!session) return '—';

  const km = getPlannedSessionKm(session);
  const detail = session.detail || '—';

  if (!km) return detail;

  // Avoid duplicating "8km" if the detail already starts with km text.
  if (/^\s*\d+(?:\.\d+)?\s*km/i.test(detail)) return detail;

  return `${km}km · ${detail}`;
}

function auditPlanTotals() {
  weeks.forEach(w => {
    const calculated = getPlannedWeekKm(w);
    const declared = Number(w.km || 0);

    if (declared && declared !== calculated) {
      console.warn(
        `Week ${w.num} total mismatch: week.km=${declared}, session total=${calculated}`
      );
    }
  });
}
// ── READINESS / ADAPTATION HELPERS ──
function getLatestCheckinForWeek(weekNum) {
  return weeklyCheckins.find(c => Number(c.week_num) === Number(weekNum)) || null;
}

function getReadinessStatus({ fatigue, niggle, sleep, completedKmPct }) {
  if (niggle >= 4) return 'red';
  if (fatigue >= 4 && sleep === 'Poor') return 'red';
  if (niggle >= 3 || fatigue >= 4 || completedKmPct < 60) return 'amber';
  return 'green';
}

function getReadinessLabel(status) {
  if (status === 'red') return 'High caution';
  if (status === 'amber') return 'Modify if needed';
  return 'Ready';
}

function getReadinessMessage(status) {
  if (status === 'red') {
    return 'Reduce load. Replace hard running with easy running until symptoms and fatigue settle.';
  }

  if (status === 'amber') {
    return 'Train, but keep the next quality session flexible. Reduce volume or intensity if needed.';
  }

  return 'Proceed with the plan. Keep easy runs genuinely easy.';
}

// ── DATE HELPERS ──
function getLocalMidnight() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function getCurrentWeekNum() {
  const today = getLocalMidnight();
  if (today < PLAN_START) return null;
  const diff = Math.floor((today - PLAN_START) / 86400000);
  return Math.max(1, Math.min(13, Math.floor(diff / 7) + 1));
}
function getCurrentDayOfWeek() { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]; }
function getWeekStartDate(n) { const d = new Date(PLAN_START); d.setDate(d.getDate() + (n-1)*7); return d; }
function daysUntilStart() { const t = getLocalMidnight(); return t < PLAN_START ? Math.ceil((PLAN_START-t)/86400000) : 0; }
function fmtDate(d) { const [y,m,day] = d.split('-'); return new Date(y,m-1,day).toLocaleDateString('en-AU',{day:'numeric',month:'short'}); }
function fmtTime(s) { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`; }
function fmtPace(speed) { if(!speed||speed===0) return '—'; const s=1000/speed; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`; }
function todayISO() { return new Date().toISOString().split('T')[0]; }

// ── STATE ──
let activities = [];
let activityNotes = {};
let sessionLogs = {}; // keyed by activity_id, array of log entries
let strengthLog = [];
let currentStrengthSession = JSON.parse(localStorage.getItem('strength_session_wip') || '{}');
let chatHistory = [];
let mealLog = [];
let currentMealType = 'Breakfast';
let currentFilter = 'all';
let currentPageName = 'dashboard';
let weeklyCheckins = [];

// ── PAGE NAVIGATION ──
const pageOrder = ['dashboard','schedule','coach','activities','meals','paces','strength','nutrition','methodology','hamstring'];
let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (window.innerWidth > 700) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
  const idx = pageOrder.indexOf(currentPageName);
  if (dx < 0 && idx < pageOrder.length - 1) showPage(pageOrder[idx+1]);
  if (dx > 0 && idx > 0) showPage(pageOrder[idx-1]);
}, { passive: true });

function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (!el) return;
  el.classList.add('active');
  currentPageName = name;
  // Find matching nav button if not passed
  if (!btn) btn = document.querySelector(`.nav-item[onclick*="'${name}'"]`);
  if (btn) btn.classList.add('active');
  // Render page content
  const renders = {
    dashboard: renderDashboard,
    schedule: renderSchedulePage,
    coach: renderCoachPage,
    activities: renderActivitiesPage,
    meals: renderMealsPage,
    paces: renderPacesPage,
    strength: renderStrengthPage,
    nutrition: renderNutritionPage,
    methodology: renderMethodologyPage,
    hamstring: renderHamstringPage
  };
  if (renders[name]) renders[name]();
  if (window.innerWidth <= 700) window.scrollTo(0, 0);
}

// ── SUPABASE DATA LOADING ──
async function loadAllData() {
  try {
    // Load live plan from Supabase (overrides hardcoded weeks if available)
    const [planWeeks, planSessions] = await Promise.all([
      api.get('plan_weeks', 'select=*&order=week_num.asc'),
      api.get('plan_sessions', 'select=*&order=week_num.asc,day_name.asc')
    ]);
    if (planWeeks && planWeeks.length > 0) {
      const dayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      weeks.forEach((w, i) => {
        const dbWeek = planWeeks.find(pw => pw.week_num === w.num);
        if (!dbWeek) return;
        // Update week metadata
        weeks[i].label = dbWeek.label;
        weeks[i].km = dbWeek.km_target;
        weeks[i].note = dbWeek.note || w.note;
        weeks[i].phase = dbWeek.phase;
        weeks[i].hamstring = dbWeek.hamstring_protocol;
        // Update sessions
        const weekSessions = planSessions.filter(s => s.week_num === w.num);
        weekSessions.forEach(s => {
          if (weeks[i].days[s.day_name]) {
           weeks[i].days[s.day_name].type = s.session_type;
          weeks[i].days[s.day_name].detail = s.detail;
          weeks[i].days[s.day_name].dot = s.dot;
          weeks[i].days[s.day_name].distance_km = Number(s.distance_km || 0);
          weeks[i].days[s.day_name].duration_min = s.duration_min || null;
          weeks[i].days[s.day_name].target_pace = s.target_pace || null;
            if (s.is_modified) {
              weeks[i].days[s.day_name]._modified = true;
              weeks[i].days[s.day_name]._reason = s.modification_reason;
            }
          }
        });
      });
      console.log('Plan loaded from Supabase');
    }
  } catch(e) { console.warn('Plan load failed, using hardcoded:', e.message); }

  try {
    // Activities
    const acts = await api.get('strava_activities', 'select=*&order=start_date.desc&limit=200');
    activities = (acts || []).map(a => ({
      ...a,
      date: a.start_date ? a.start_date.split('T')[0] : a.date,
      distance: a.distance ? (a.distance / 1000).toFixed(2) : '0',
      pace: a.pace || fmtPace(a.average_speed),
      source: 'strava'
    }));
    document.getElementById('sidebar-sync-dot').classList.add('on');
    document.getElementById('sidebar-sync-text').textContent = `${activities.length} activities`;
    const lu = document.getElementById('last-updated');
    if (lu) lu.textContent = `Updated ${new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}`;
  } catch(e) { console.warn('Activities load failed:', e.message); }

  try {
    const logs = await api.get('session_logs', 'select=*&order=created_at.desc&limit=500');
    sessionLogs = {};
    (logs || []).forEach(l => {
      if (!sessionLogs[l.activity_id]) sessionLogs[l.activity_id] = [];
      sessionLogs[l.activity_id].push(l);
    });
  } catch(e) { console.warn('Session logs load failed:', e.message); }

  try {
    const notes = await api.get('activity_notes', 'select=*');
    activityNotes = {};
    (notes || []).forEach(n => { activityNotes[n.activity_id] = n.note; });
  } catch(e) { console.warn('Notes load failed:', e.message); }

  try {
    const sessions = await api.get('strength_sessions', 'select=*&order=session_date.desc&limit=30');
    strengthLog = (sessions || []).map(s => ({
      id: s.id,
      date: s.session_date,
      week: s.week_num,
      exercises: s.exercises || []
    }));
  } catch(e) { console.warn('Strength load failed:', e.message); }

  try {
    const meals = await api.get('meal_log', 'select=*&order=created_at.desc&limit=200');
    mealLog = (meals || []).map(m => ({
      id: m.id,
      date: m.meal_date,
      time: m.meal_time,
      type: m.meal_type,
      text: m.description,
      protein: m.protein_g,
      carbs: m.carbs_g,
      fat: m.fat_g,
      kcal: m.kcal
    }));
  } catch(e) { console.warn('Meals load failed:', e.message); }

  try {
    const history = await api.get('chat_history', 'select=*&order=created_at.asc&limit=80');
    chatHistory = (history || []).map(h => ({ role: h.role, content: h.content }));
  } catch(e) { console.warn('Chat history load failed:', e.message); }
  
try {
  const checkins = await api.get('weekly_checkins', 'select=*&order=created_at.desc&limit=20');
  weeklyCheckins = checkins || [];
} catch(e) {
  console.warn('Weekly check-ins load failed:', e.message);
}
  
  // Re-render current page with fresh data
  auditPlanTotals();
  showPage(currentPageName);
}

// ── ACTIVITY MATCHING ──
function matchActivityToSession(act) {
  if (!act.date) return null;
  const [y,m,d] = act.date.split('-');
  const dt = new Date(y, m-1, d);
  const diffDays = Math.floor((dt - PLAN_START) / 86400000);
  if (diffDays < 0) return null;
  const weekNum = Math.floor(diffDays / 7) + 1;
  const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
  if (weekNum < 1 || weekNum > 13) return null;
  return { week: weekNum, day: dayName, planned: weeks[weekNum-1].days[dayName] };
}

function getMatchQuality(act, planned) {
  if (!planned || planned.dot === 'rest') return 'unmatched';
  if (!act.pace) return 'ok';
  const [m,s] = act.pace.split(':').map(Number);
  const secs = m*60 + (s||0);
  if (planned.dot === 'easy') return (secs >= 310 && secs <= 390) ? 'great' : secs < 310 ? 'warn' : 'miss';
  if (planned.dot === 'hard') return (secs >= 230 && secs <= 270) ? 'great' : 'ok';
  if (planned.dot === 'moderate') return (secs >= 260 && secs <= 310) ? 'great' : 'ok';
  return 'ok';
}

function buildActivityIndex() {
  const idx = {};
  activities.forEach(act => {
    const match = matchActivityToSession(act);
    if (!match) return;
    const key = `${match.week}-${match.day}`;
    if (!idx[key]) idx[key] = [];
    idx[key].push(act);
  });
  return idx;
}

// ── DASHBOARD ──
function renderDashboard() {
  const wkNum = getCurrentWeekNum();
  const daysToRace = Math.ceil((RACE_DATE - new Date()) / 86400000);
  const today = new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});
  const el = document.getElementById('page-dashboard');

  // Race countdown message
  const countdownMsg = daysToRace > 84 ? 'Build the habit. Easy wins everything right now.'
    : daysToRace > 56 ? 'Deep in the build. This is where fitness is made.'
    : daysToRace > 28 ? 'Peak phase. Trust the process — sharpness is coming.'
    : daysToRace > 14 ? 'Taper time. The work is done. Freshen up.'
    : daysToRace > 7 ? 'Race week. Short, sharp, and sleep well.'
    : daysToRace > 0 ? `${daysToRace} day${daysToRace!==1?'s':''} to go. You\'re ready.`
    : 'Race day! Go sub-42. 🏁';

  let greeting, weekLabel, phaseText, kmLogged, kmPlanned, todayType, todayDetail, session, day;
  day = getCurrentDayOfWeek();
  if (!wkNum) {
    const d = daysUntilStart();
    greeting = `Plan starts in ${d} day${d!==1?'s':''} — 27 April. Keep this week easy.`;
    weekLabel = '—'; phaseText = 'Pre-plan'; kmLogged = '—'; kmPlanned = '—';
    todayType = 'Maintenance'; todayDetail = 'Easy running only this week';
  } else {
    const w = weeks[wkNum-1];
    greeting = `${today} · Week ${wkNum} of 13 · ${w.label}`;
    weekLabel = `${wkNum} / 13`; phaseText = `${phaseLabel[w.phase]} Phase`;
    const wkStart = getWeekStartDate(wkNum);
    const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
    kmLogged = activities.filter(a => {
      const [y,m,d] = (a.date||'').split('-');
      const dt = new Date(y,m-1,d);
      return dt >= wkStart && dt <= wkEnd && !a.sport_type?.includes('Weight') && !a.sport_type?.includes('Ride');
    }).reduce((s,a) => s + parseFloat(a.distance||0), 0).toFixed(1);
    kmPlanned = getPlannedWeekKm(w);
    session = w.days[day];
    todayType = session?.type || 'Rest';
    todayDetail = session?.dot === 'rest' ? 'Recovery is training' : (session?.detail?.split('·')[0].trim() || '');  }

  // ── Training load chart ──
  const plannedKmByWeek = getPlannedKmByWeek();
  const maxKm = Math.max(...Object.values(plannedKmByWeek));

  // Calculate actual km per week
  const actualKmByWeek = {};
  weeks.forEach(w => {
    const ws = getWeekStartDate(w.num);
    const we = new Date(ws); we.setDate(we.getDate()+6);
    actualKmByWeek[w.num] = activities.filter(a => {
      const [y,m,d2] = (a.date||'').split('-');
      const dt = new Date(y,m-1,d2);
      return dt >= ws && dt <= we && !a.sport_type?.includes('Weight') && !a.sport_type?.includes('Ride');
    }).reduce((s,a) => s + parseFloat(a.distance||0), 0);
  });

  const phaseColours = { base:'load-phase-base', build:'load-phase-build', peak:'load-phase-peak', taper:'load-phase-taper' };
  const phaseActual = { base:'#1D9E75', build:'#378ADD', peak:'#EF9F27', taper:'#E24B4A' };

   const loadChartHTML = `
    <style>
      .load-chart-v2 {
        margin-top: 14px;
      }

      .load-bars-v2 {
        height: 150px;
        display: grid;
        grid-template-columns: repeat(13, minmax(0, 1fr));
        gap: 8px;
        align-items: end;
      }

      .load-week-v2 {
        height: 100%;
        display: grid;
        grid-template-rows: 18px 1fr 16px;
        align-items: end;
        text-align: center;
        min-width: 0;
      }

      .load-value-v2 {
        font-family: var(--mono);
        font-size: 10px;
        color: var(--text-muted);
        line-height: 1;
      }

      .load-column-v2 {
        height: 100%;
        display: flex;
        align-items: end;
        justify-content: center;
      }

      .load-planned-v2 {
        width: 100%;
        max-width: 20px;
        min-height: 4px;
        border-radius: 6px 6px 2px 2px;
        position: relative;
        overflow: hidden;
        opacity: 0.55;
      }

      .load-actual-v2 {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--accent);
        border-radius: 6px 6px 2px 2px;
        opacity: 0.95;
      }

      .load-label-v2 {
        font-family: var(--mono);
        font-size: 10px;
        color: var(--text-muted);
        padding-top: 4px;
      }

      .load-week-v2.is-current .load-planned-v2 {
        outline: 2px solid var(--blue);
        outline-offset: 2px;
        opacity: 0.85;
      }

      .load-legend-v2 {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 14px;
        margin-top: 12px;
        font-size: 11px;
        color: var(--text-muted);
      }

      .load-legend-v2 span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .load-legend-v2 i {
        width: 9px;
        height: 9px;
        border-radius: 2px;
        display: inline-block;
      }

      .legend-actual {
        background: var(--accent);
      }

      .legend-current {
        background: transparent;
        outline: 2px solid var(--blue);
        outline-offset: 1px;
      }
    </style>

    <div class="load-chart-v2">
      <div class="load-bars-v2">
        ${weeks.map(w => {
          const planned = plannedKmByWeek[w.num] || 0;
          const actual = actualKmByWeek[w.num] || 0;
          const plannedPct = maxKm ? Math.max(5, planned / maxKm * 100) : 0;
          const actualPct = planned ? Math.min(100, actual / planned * 100) : 0;
          const isCur = wkNum === w.num;
          const isPast = wkNum && w.num < wkNum;
          const valueLabel = planned;

          return `
            <div class="load-week-v2 ${isCur ? 'is-current' : ''}" title="Week ${w.num}: ${planned}km planned, ${actual.toFixed(1)}km logged">
              <div class="load-value-v2">${valueLabel}</div>
              <div class="load-column-v2">
                <div class="load-planned-v2 ${phaseColours[w.phase]}" style="height:${plannedPct}%">
                  ${actual > 0 && planned > 0 ? `<div class="load-actual-v2" style="height:${actualPct}%"></div>` : ''}
                </div>
              </div>
              <div class="load-label-v2">${w.num}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="load-legend-v2">
        <span><i class="load-phase-base"></i>Base</span>
        <span><i class="load-phase-build"></i>Build</span>
        <span><i class="load-phase-peak"></i>Peak</span>
        <span><i class="load-phase-taper"></i>Taper</span>
        <span><i class="legend-actual"></i>Actual done</span>
        ${wkNum ? `<span><i class="legend-current"></i>Current week</span>` : ''}
      </div>
    </div>`;

  // Trends + HR analysis
  const runs = activities.filter(a => !a.sport_type?.includes('Weight') && !a.sport_type?.includes('Ride'));
  const easyRuns = runs.filter(a => matchActivityToSession(a)?.planned?.dot === 'easy').slice(0,5);
  const runsWithHR = runs.filter(a => a.average_heartrate > 0).slice(0,5);
  const avgHR = runsWithHR.length ? Math.round(runsWithHR.reduce((s,a)=>s+(a.average_heartrate||0),0)/runsWithHR.length) : null;
  const easyRunsWithHR = easyRuns.filter(a => a.average_heartrate > 0);
  const avgEasyHR = easyRunsWithHR.length ? Math.round(easyRunsWithHR.reduce((s,a)=>s+(a.average_heartrate||0),0)/easyRunsWithHR.length) : null;
  // HR zones based on 180-age formula (approx max HR ~187 for late 20s/early 30s - adjust if needed)
  const hrEasyTarget = 148; // Z2 upper limit (~79% max HR)
  let trendsHTML = '<div style="font-size:13px;color:var(--text-muted)">Log activities to see trends.</div>';
  if (runs.length >= 1) {
    const avgPace = easyRuns.length ? easyRuns.reduce((s,a) => { const [m,sec] = (a.pace||'6:00').split(':').map(Number); return s+m*60+(sec||0); },0)/easyRuns.length : null;
    const fmt = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
   const compliance = wkNum > 1 ? (() => {
  let planned = 0;
  let actual = 0;

  for (let weekNum = Math.max(1, wkNum - 3); weekNum < wkNum; weekNum++) {
    planned += getPlannedWeekKm(weeks[weekNum - 1]);

    const ws = getWeekStartDate(weekNum);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);

    actual += activities
      .filter(a => {
        const [y, m, d] = (a.date || '').split('-');
        const dt = new Date(y, m - 1, d);

        return (
          dt >= ws &&
          dt <= we &&
          !a.sport_type?.includes('Weight') &&
          !a.sport_type?.includes('Ride')
        );
      })
      .reduce((s, a) => s + parseFloat(a.distance || 0), 0);
  }

  return planned > 0 ? Math.round(actual / planned * 100) : null;
})() : null;
    trendsHTML = `
      ${avgPace ? `<div class="trend-row"><span class="trend-label">Avg easy run pace (last ${easyRuns.length})</span><span class="trend-val">${fmt(avgPace)}/km <span class="trend-flag ${avgPace>=310?'tf-good':'tf-warn'}">${avgPace>=310?'On Target':'Too Fast'}</span></span></div>` : ''}
      ${avgEasyHR ? `<div class="trend-row"><span class="trend-label">Avg HR on easy runs</span><span class="trend-val">${avgEasyHR} bpm <span class="trend-flag ${avgEasyHR<=hrEasyTarget?'tf-good':avgEasyHR<=hrEasyTarget+10?'tf-warn':'tf-warn'}">${avgEasyHR<=hrEasyTarget?'Z2':'Running Hot'}</span></span></div>` : ''}
      ${avgHR ? `<div class="trend-row"><span class="trend-label">Avg HR all runs (last ${runsWithHR.length})</span><span class="trend-val">${avgHR} bpm</span></div>` : ''}
      ${compliance !== null ? `<div class="trend-row"><span class="trend-label">Volume compliance (last 4 wks)</span><span class="trend-val">${compliance}% <span class="trend-flag ${compliance>=85?'tf-good':compliance>=60?'tf-warn':'tf-info'}">${compliance>=85?'On Track':compliance>=60?'Slightly Under':'Building'}</span></span></div>` : ''}
      <div class="trend-row"><span class="trend-label">Strength sessions logged</span><span class="trend-val">${strengthLog.length}</span></div>
      <div class="trend-row"><span class="trend-label">Total activities</span><span class="trend-val">${activities.length}</span></div>`;
  }

  // Today macros
  const todayMeals = mealLog.filter(m => m.date === todayISO());
  const macroTotals = todayMeals.reduce((t,m)=>({p:t.p+(m.protein||0),c:t.c+(m.carbs||0),f:t.f+(m.fat||0),k:t.k+(m.kcal||0)}),{p:0,c:0,f:0,k:0});
  const macroHTML = todayMeals.length
    ? `<div class="macro-bars" style="margin-bottom:8px">
        <div><div class="macro-bar-label"><span>Protein</span><span>${Math.round(macroTotals.p)}g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-protein" style="width:${Math.min(100,macroTotals.p/130*100).toFixed(0)}%"></div></div></div>
        <div><div class="macro-bar-label"><span>Carbs</span><span>${Math.round(macroTotals.c)}g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-carbs" style="width:${Math.min(100,macroTotals.c/450*100).toFixed(0)}%"></div></div></div>
        <div><div class="macro-bar-label"><span>Fat</span><span>${Math.round(macroTotals.f)}g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-fat" style="width:${Math.min(100,macroTotals.f/80*100).toFixed(0)}%"></div></div></div>
      </div><div style="font-size:12px;color:var(--text-muted);text-align:center">${Math.round(macroTotals.k)} kcal · ${todayMeals.length} item${todayMeals.length!==1?'s':''} logged</div>`
    : '<div style="font-size:13px;color:var(--text-muted)">No food logged today. <button class="btn-secondary" style="font-size:12px;padding:4px 10px;margin-left:6px" onclick="showPage(\'meals\')">Log food →</button></div>';

el.innerHTML = `
  <div class="dashboard-stack">
    <div>
      <div class="page-title">Dashboard</div>
      <p class="page-sub">${greeting}</p>
    </div>

    <!-- Race countdown -->
    <div class="digest-card" style="margin-bottom:16px;background:linear-gradient(135deg,#1A3A2A 0%,#0F2318 100%);border:none">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:11px;font-family:var(--mono);color:rgba(255,255,255,0.5);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">Race Countdown</div>
          <div style="font-size:48px;font-family:var(--serif);font-weight:300;color:#fff;line-height:1">${daysToRace}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px">days to 19 July 2026</div>
        </div>
        <div style="text-align:right;max-width:240px">
          <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5;font-style:italic">"${countdownMsg}"</div>
          <div style="margin-top:12px">
            <div style="height:4px;background:rgba(255,255,255,0.15);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,Math.round((1-daysToRace/84)*100))}%;background:#1D9E75;border-radius:2px;transition:width 0.5s"></div>
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;font-family:var(--mono)">${Math.min(100,Math.round((1-daysToRace/84)*100))}% of plan complete</div>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="dash-stat-card"><div class="dsc-label">Current Week</div><div class="dsc-value">${weekLabel}</div><div class="dsc-sub">${phaseText}</div></div>
      <div class="dash-stat-card"><div class="dsc-label">This Week</div><div class="dsc-value">${kmLogged}</div><div class="dsc-sub">of ${kmPlanned} km planned</div></div>
      <div class="dash-stat-card"><div class="dsc-label">Today</div><div class="dsc-value" style="font-size:16px;padding-top:6px">${todayType}</div><div class="dsc-sub">${todayDetail}</div></div>
      ${avgHR ? `<div class="dash-stat-card"><div class="dsc-label">Avg Heart Rate</div><div class="dsc-value" style="color:${avgEasyHR&&avgEasyHR>hrEasyTarget?'#EF9F27':'var(--text)'}">${avgHR}</div><div class="dsc-sub">bpm avg · ${avgEasyHR?avgEasyHR+' bpm easy runs':''}</div></div>` : ''}
    </div>

    ${wkNum && session && session.dot !== 'rest' ? `
    <div class="digest-card" style="margin-bottom:16px;border-left:3px solid var(--accent)">
      <div class="digest-header" style="margin-bottom:10px">
        <div>
          <div style="font-size:11px;font-family:var(--mono);color:var(--accent);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:2px">Today's Session Brief</div>
          <div class="digest-title">${session.type}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${session.detail}</div>
        </div>
      </div>
      <div id="session-brief-content"><span style="color:var(--text-faint);font-style:italic;font-size:13px">Loading brief…</span></div>
    </div>` : ''}

    <div class="digest-card">
      <div class="digest-header" style="margin-bottom:4px"><div class="digest-title">Training Load — 13 Weeks</div></div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Bar height = planned weekly load. Dark fill = actual completed.</p>
      ${loadChartHTML}
    </div>
    <div class="digest-card">
      <div class="digest-header">
        <div class="digest-title">Weekly Digest</div>
        <button class="digest-btn" id="digest-btn" onclick="generateDigest()"><span id="digest-icon">✦</span> Generate</button>
      </div>
      <div class="digest-content" id="digest-content" style="color:var(--text-faint);font-style:italic">Click Generate for your AI weekly summary and coaching notes.</div>
    </div>
    <div class="digest-card">
      <div class="digest-header" style="margin-bottom:8px"><div class="digest-title">Training Trends</div></div>
      <div>${trendsHTML}</div>
    </div>
    <div class="digest-card">
      <div class="digest-header" style="margin-bottom:8px">
        <div class="digest-title">Today's Nutrition</div>
        <button class="btn-secondary" onclick="showPage('meals')" style="font-size:12px;padding:5px 12px">Log food →</button>
      </div>
      ${macroHTML}
    </div>
${wkNum ? `
<div class="digest-card">
  <div class="digest-header" style="margin-bottom:12px">
    <div>
      <div class="digest-title">Weekly Check-In</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">A quick status check so the coach can adjust the week intelligently.</div>
    </div>
  </div>

  <div class="checkin-grid">
    <div class="checkin-field">
      <label>Fatigue</label>
      <select class="checkin-input" id="checkin-fatigue">
        <option value="">Select</option>
        <option value="1">1 · Fresh</option>
        <option value="2">2 · Good</option>
        <option value="3">3 · Normal</option>
        <option value="4">4 · Tired</option>
        <option value="5">5 · Very tired</option>
      </select>
    </div>

    <div class="checkin-field">
      <label>Soreness / niggles</label>
      <select class="checkin-input" id="checkin-niggle">
        <option value="">Select</option>
        <option value="0">0 · None</option>
        <option value="1">1 · Mild awareness</option>
        <option value="2">2 · Manageable</option>
        <option value="3">3 · Needs caution</option>
        <option value="4">4 · Modify training</option>
        <option value="5">5 · Do not run hard</option>
      </select>
    </div>

    <div class="checkin-field">
      <label>Sleep</label>
      <select class="checkin-input" id="checkin-sleep">
        <option>Good</option>
        <option>OK</option>
        <option>Poor</option>
      </select>
    </div>

    <div class="checkin-field">
      <label>Confidence</label>
      <select class="checkin-input" id="checkin-confidence">
        <option value="">Select</option>
        <option value="1">1 · Low</option>
        <option value="2">2 · Unsure</option>
        <option value="3">3 · OK</option>
        <option value="4">4 · Good</option>
        <option value="5">5 · High</option>
      </select>
    </div>
  </div>

  <textarea class="checkin-notes" id="checkin-notes" rows="2" placeholder="Anything the coach should know? e.g. easing back in, busy week, tight calf, missed session..."></textarea>

  <div style="display:flex;justify-content:flex-end;margin-top:10px">
    <button class="btn-primary" onclick="saveWeeklyCheckin()">Save Check-In</button>
  </div>
</div>
` : ''}

<div class="digest-card" id="recommendations-card">
  <div class="digest-header">
    <div class="digest-title">Coach Recommendations</div>
    <button class="digest-btn" id="rec-btn" onclick="generateRecommendations()"><span>✦</span> Analyse</button>
  </div>
  <div id="rec-content" style="font-size:13px;color:var(--text-faint);font-style:italic">Click Analyse — the coach will review your recent training data and suggest any changes to upcoming sessions.</div>
</div>
</div>`;

  // Auto-generate session brief if there's a training session today
  if (wkNum && session && session.dot !== 'rest') {
    generateSessionBrief(session, wkNum, day);
  }
}

async function saveWeeklyCheckin() {
  const wkNum = getCurrentWeekNum() || 1;

  const fatigue = Number(document.getElementById('checkin-fatigue')?.value || 0);
  const niggle = Number(document.getElementById('checkin-niggle')?.value || 0);
  const sleep = document.getElementById('checkin-sleep')?.value || 'OK';
  const confidence = Number(document.getElementById('checkin-confidence')?.value || 0);
  const notes = document.getElementById('checkin-notes')?.value || '';

  try {
    await api.post('weekly_checkins', {
      week_num: wkNum,
      fatigue_score: fatigue,
      hamstring_score: niggle,
      sleep_quality: sleep,
      confidence_score: confidence,
      notes
    }, 'return=minimal');

    await loadAllData();
    alert('Weekly check-in saved.');
  } catch(e) {
    alert('Could not save check-in: ' + e.message);
  }
}

async function generateDigest() {
  const btn = document.getElementById('digest-btn');
  const content = document.getElementById('digest-content');
  btn.disabled = true; btn.innerHTML = '<span class="spin">⟳</span> Generating…';
  content.style.fontStyle = 'italic'; content.style.color = 'var(--text-faint)';
  content.textContent = 'Analysing your training data…';

  const wkNum = getCurrentWeekNum() || 1;
  const w = weeks[wkNum-1];
  const wkStart = getWeekStartDate(wkNum);
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
  const thisWeekRuns = activities.filter(a => {
    const [y,m,d] = (a.date||'').split('-'); const dt = new Date(y,m-1,d);
    return dt >= wkStart && dt <= wkEnd;
  });
  const runSummary = thisWeekRuns.map(a => `  • ${a.date}: ${a.sport_type||'Run'} ${a.distance}km @ ${a.pace||'—'}/km${activityNotes[String(a.strava_id||a.id)] ? ' | "'+activityNotes[String(a.strava_id||a.id)]+'"' : ''}`).join('\n') || '  None logged';
  const strengthSummary = strengthLog.slice(0,3).map(e => `  Wk${e.week} ${e.date}: ${(e.exercises||[]).filter(ex=>ex.sets?.some(s=>s.kg||s.reps)).map(ex=>`${ex.name?.split(' ')[0]} ${ex.sets?.reduce((b,s)=>parseFloat(s.kg||0)>parseFloat(b.kg||0)?s:b,{}).kg||'?'}kg`).join(', ')}`).join('\n') || '  None';

  try {
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        system: 'You are a running coach writing a concise weekly digest. Be specific, reference actual data. Use plain text, no markdown. 3-4 short paragraphs max.',
       messages: [{ role:'user', content:`Write a weekly training digest for Week ${wkNum} of 13 (${w.label}, ${w.phase} phase, ${getPlannedWeekKm(w)}km planned).\n\nThis week:\n${runSummary}\n\nRecent strength:\n${strengthSummary}\n\nDays to race: ${Math.ceil((RACE_DATE-new Date())/86400000)}\n\nCover what went well, what needs attention, key focus for next week. Be specific and encouraging.` }],
        max_tokens: 600
      })
    });
    const data = await res.json();
    content.style.fontStyle = 'normal'; content.style.color = 'var(--text-muted)';
    content.textContent = data.content || data.error || 'Could not generate digest.';
  } catch(e) { content.textContent = 'Network error — check connection.'; }
  btn.disabled = false; btn.innerHTML = '<span>✦</span> Regenerate';
}

// ── MORE DRAWER (mobile) ──
function openMoreDrawer() {
  const drawer = document.getElementById('more-drawer');
  const overlay = document.getElementById('more-overlay');
  const btn = document.getElementById('more-btn');
  if (!drawer) return;
  drawer.style.display = 'block';
  overlay.style.display = 'block';
  if (btn) btn.classList.add('active-section');
  // Animate up
  drawer.style.transform = 'translateY(100%)';
  requestAnimationFrame(() => {
    drawer.style.transition = 'transform 0.3s ease';
    drawer.style.transform = 'translateY(0)';
  });
}

function closeMoreDrawer() {
  const drawer = document.getElementById('more-drawer');
  const overlay = document.getElementById('more-overlay');
  const btn = document.getElementById('more-btn');
  if (!drawer) return;
  drawer.style.transform = 'translateY(100%)';
  setTimeout(() => {
    drawer.style.display = 'none';
    overlay.style.display = 'none';
  }, 300);
  if (btn) btn.classList.remove('active-section');
}

function showPageFromDrawer(name) {
  closeMoreDrawer();
  setTimeout(() => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    showPage(name);
    // Mark More button as active-section so user knows they're in reference
    const btn = document.getElementById('more-btn');
    if (btn) btn.classList.add('active-section');
  }, 200);
}

// ── PRE-SESSION BRIEF ──
const BRIEF_CACHE_KEY = 'session_brief_cache';

function getTodayBriefCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(BRIEF_CACHE_KEY) || '{}');
    if (cache.date === todayISO() && cache.brief) return cache.brief;
  } catch(e) {}
  return null;
}

function saveTodayBriefCache(brief) {
  localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({ date: todayISO(), brief }));
}

async function generateSessionBrief(session, wkNum, day) {
  const el = document.getElementById('session-brief-content');
  if (!el) return;

  // Check cache first — don't call API if we already have today's brief
  const cached = getTodayBriefCache();
  if (cached) {
    el.innerHTML = cached;
    return;
  }

  el.innerHTML = `<span style="color:var(--text-faint);font-style:italic">Generating brief…</span>`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: `You are a running coach giving a pre-session brief. Be concise — maximum 4 short bullet points. Plain text only, use • for bullets. Cover: 1) key focus for this session, 2) target paces/reps, 3) one warm-up tip, 4) one thing to watch for. No waffle, no encouragement fluff — just the practical essentials.`,
        messages: [{
          role: 'user',
          content: `Pre-session brief for Week ${wkNum}, ${day}: ${session.type} — ${session.detail}. Athlete context: sub-42 10km plan, 5km PB 20:50, hamstring overload protocol active weeks 1-4.`
        }],
        max_tokens: 200
      })
    });
    const data = await res.json();
    const brief = data.content || 'Could not generate brief.';
    // Format bullets as styled HTML
    const formatted = brief.split('\n')
      .filter(l => l.trim())
      .map(l => `<div style="display:flex;gap:8px;margin-bottom:6px;font-size:13px;line-height:1.5"><span style="color:var(--accent);flex-shrink:0">•</span><span style="color:var(--text-muted)">${l.replace(/^[•\-]\s*/,'')}</span></div>`)
      .join('');
    saveTodayBriefCache(formatted);
    el.innerHTML = formatted;
  } catch(e) {
    el.innerHTML = `<span style="font-size:13px;color:var(--text-muted)">Could not load brief — check connection.</span>`;
  }
}
let acceptedRecs = JSON.parse(localStorage.getItem('accepted_recs') || '[]');
let dismissedRecs = JSON.parse(localStorage.getItem('dismissed_recs') || '[]');
let activeRecommendations = [];

async function generateRecommendations() {
  const btn = document.getElementById('rec-btn');
  const content = document.getElementById('rec-content');
  if (!btn || !content) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin">⟳</span> Analysing…';
  content.style.fontStyle = 'italic';
  content.style.color = 'var(--text-faint)';
  content.textContent = 'Reviewing your recent training data…';

  const wkNum = getCurrentWeekNum() || 1;
  try {
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
  weeklyCheckins: weeklyCheckins.slice(0, 5),
  activities: activities.slice(0, 10).map(a => ({
          date: a.date,
          sport_type: a.sport_type,
          distance: a.distance,
          pace: a.pace,
          average_heartrate: a.average_heartrate,
          strava_id: a.strava_id,
          id: a.id
        })),
        notes: activityNotes,
        strengthLog: strengthLog.slice(0, 5),
        currentWeek: wkNum,
        weeks: weeks.map(w => ({
          num: w.num,
          phase: w.phase,
          km: getPlannedWeekKm(w),
          days: w.days
        }))
      })
    });
    const data = await res.json();
    activeRecommendations = data.recommendations || [];
    renderRecommendations(data);
  } catch(e) {
    content.style.fontStyle = 'normal';
    content.textContent = 'Could not generate recommendations — check your connection.';
  }
  btn.disabled = false;
  btn.innerHTML = '<span>✦</span> Re-analyse';
}

function renderRecommendations(data) {
  const content = document.getElementById('rec-content');
  if (!content) return;
  content.style.fontStyle = 'normal';
  content.style.color = 'var(--text)';

  const recs = (data.recommendations || []).filter(r =>
    !dismissedRecs.includes(r.id)
  );

  // Status banner
  const statusColour = data.status === 'on_track' ? '#1D9E75' : '#EF9F27';
  const statusIcon = data.status === 'on_track' ? '✓' : '⚠';

  if (recs.length === 0) {
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--accent-light);border-radius:8px;font-size:13px;color:var(--accent)">
        <span style="font-size:16px">✓</span>
        <span>${data.summary || 'Training looks good — no changes needed this week.'}</span>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--amber-light);border-radius:8px;font-size:13px;color:var(--amber);margin-bottom:14px">
      <span style="font-size:16px">⚠</span>
      <span>${data.summary}</span>
    </div>
    ${recs.map(rec => {
      const accepted = acceptedRecs.includes(rec.id);
      const priorityColour = rec.priority === 'high' ? 'var(--red)' : rec.priority === 'medium' ? '#EF9F27' : 'var(--blue)';
      return `<div class="rec-card ${accepted ? 'rec-accepted' : ''}" id="rec-${rec.id}" style="border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden">
        <div style="padding:12px 14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:10px;font-family:var(--mono);font-weight:500;padding:2px 8px;border-radius:10px;background:${priorityColour}20;color:${priorityColour}">${rec.priority?.toUpperCase()||'SUGGESTION'}</span>
            <span style="font-size:13px;font-weight:500">${rec.session}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:8px;font-size:12px">
            <div style="background:var(--red-light);border-radius:6px;padding:6px 10px;color:var(--red)">
              <div style="font-size:10px;font-family:var(--mono);margin-bottom:2px;opacity:0.7">CURRENT</div>
              ${rec.current}
            </div>
            <div style="color:var(--text-faint);font-size:18px">→</div>
            <div style="background:var(--accent-light);border-radius:6px;padding:6px 10px;color:var(--accent)">
              <div style="font-size:10px;font-family:var(--mono);margin-bottom:2px;opacity:0.7">PROPOSED</div>
              ${rec.proposed}
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px">${rec.reason}</div>
          ${accepted
            ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#1D9E75;font-family:var(--mono)">✓ Accepted — check your schedule for the updated session</div>`
            : `<div style="display:flex;gap:8px">
                <button onclick="acceptRec('${rec.id}')" style="flex:1;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:7px;font-size:12px;font-family:var(--sans);font-weight:500;cursor:pointer">✓ Accept change</button>
                <button onclick="dismissRec('${rec.id}')" style="flex:1;padding:8px;background:transparent;color:var(--text-muted);border:1px solid var(--border-strong);border-radius:7px;font-size:12px;font-family:var(--sans);cursor:pointer">✕ Dismiss</button>
              </div>`
          }
        </div>
      </div>`;
    }).join('')}`;
}

function acceptRec(id) {
  if (!acceptedRecs.includes(id)) {
    acceptedRecs.push(id);
    localStorage.setItem('accepted_recs', JSON.stringify(acceptedRecs));
  }
  // Find the recommendation and apply it to the schedule
  const rec = activeRecommendations.find(r => r.id === id);
  if (rec) {
    // Store accepted modifications so schedule can show them
    let mods = JSON.parse(localStorage.getItem('schedule_mods') || '{}');
    const wkNum = getCurrentWeekNum() || 1;
    if (!mods[wkNum]) mods[wkNum] = [];
    mods[wkNum].push({
      id: rec.id,
      session: rec.session,
      original: rec.current,
      modified: rec.proposed,
      reason: rec.reason,
      accepted_at: new Date().toISOString()
    });
    localStorage.setItem('schedule_mods', JSON.stringify(mods));
  }
  // Re-render the card
  renderRecommendations({ recommendations: activeRecommendations, summary: 'Changes applied — see your updated schedule.' });
  // Refresh schedule if open
  if (currentPageName === 'schedule') renderSchedulePage();
}

function dismissRec(id) {
  if (!dismissedRecs.includes(id)) {
    dismissedRecs.push(id);
    localStorage.setItem('dismissed_recs', JSON.stringify(dismissedRecs));
  }
  renderRecommendations({ recommendations: activeRecommendations, summary: activeRecommendations.length > 1 ? 'Some suggestions dismissed.' : 'Suggestion dismissed.' });
}

// ── SCHEDULE PAGE ──
function renderSchedulePage() {
  const el = document.getElementById('page-schedule');
  el.innerHTML = `
    <div class="page-title">Weekly Schedule</div>
    <p class="page-sub">13 weeks · Starts 27 April 2026 · Wks 1–2 gentle return, Wk 4 deload, Wks 5–9 build, Wks 10–11 peak, Wks 12–13 taper.</p>
    <div class="phase-strip">
      <div class="phase-block ph-base" onclick="filterPhase('base')"><div class="ph-label">Phase 1</div><div class="ph-name">Base</div><div class="ph-wks">Wks 1–4</div></div>
      <div class="phase-block ph-build" onclick="filterPhase('build')"><div class="ph-label">Phase 2</div><div class="ph-name">Build</div><div class="ph-wks">Wks 5–9</div></div>
      <div class="phase-block ph-peak" onclick="filterPhase('peak')"><div class="ph-label">Phase 3</div><div class="ph-name">Peak</div><div class="ph-wks">Wks 10–11</div></div>
      <div class="phase-block ph-taper" onclick="filterPhase('taper')"><div class="ph-label">Phase 4</div><div class="ph-name">Taper</div><div class="ph-wks">Wks 12–13</div></div>
    </div>
    <div class="week-filter">
      <button class="filter-btn ${currentFilter==='all'?'active':''}" onclick="filterPhase('all',this)">All Weeks</button>
      <button class="filter-btn ${currentFilter==='base'?'active':''}" onclick="filterPhase('base',this)">Base</button>
      <button class="filter-btn ${currentFilter==='build'?'active':''}" onclick="filterPhase('build',this)">Build</button>
      <button class="filter-btn ${currentFilter==='peak'?'active':''}" onclick="filterPhase('peak',this)">Peak</button>
      <button class="filter-btn ${currentFilter==='taper'?'active':''}" onclick="filterPhase('taper',this)">Taper</button>
    </div>
    <div id="weeks-container"></div>`;
  renderWeeks();
}

function renderWeeks() {
  const c = document.getElementById('weeks-container');
  if (!c) return;
  c.innerHTML = '';
  const wkNum = getCurrentWeekNum();
  const actIdx = buildActivityIndex();

  weeks.forEach(w => {
    if (currentFilter !== 'all' && w.phase !== currentFilter) return;
    const isCurrent = wkNum !== null && w.num === wkNum;
    const wkStart = getWeekStartDate(w.num);
    const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
    const dateStr = wkStart.toLocaleDateString('en-AU',{day:'numeric',month:'short'}) + ' – ' + wkEnd.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
    let actualKm = 0;
    dayOrder.forEach(day => { const key=`${w.num}-${day}`; if(actIdx[key]) actIdx[key].forEach(a=>{ actualKm+=parseFloat(a.distance||0); }); });
    const plannedKm = getPlannedWeekKm(w);
    const declaredKm = Number(w.km || 0);
    const totalMismatch = declaredKm && declaredKm !== plannedKm;

    const daysHTML = dayOrder.map(day => {
      const d = w.days[day];
      const isRest = d.dot === 'rest';
      const isTodayCard = isCurrent && day === getCurrentDayOfWeek();
      const key = `${w.num}-${day}`;
      const dayActs = actIdx[key] || [];
      let overlayHTML = '';
      dayActs.forEach(act => {
        const quality = getMatchQuality(act, d);
        const qClass = quality==='great'?'match-great':quality==='warn'?'match-warn':quality==='miss'?'match-miss':'';
        const labelText = quality==='great'?'✓ On Target':quality==='warn'?'⚠ Check Pace':quality==='miss'?'✗ Off Plan':'↗ Strava';
        overlayHTML += `<div class="activity-overlay ${qClass}"><div class="ao-label">${labelText}</div><div style="font-size:11px;color:var(--text-muted)">${act.distance}km · ${act.pace||'—'}/km${act.elapsed_time?' · '+fmtTime(act.elapsed_time):''}</div></div>`;
      });
      const modifiedBadge = d._modified ? `<div style="font-size:10px;font-family:var(--mono);color:#378ADD;margin-top:4px">✎ Coach modified${d._reason ? ` — ${d._reason}` : ''}</div>` : '';
      return `<div class="day-card ${isRest?'rest-card':''}" style="${isTodayCard?'border:2px solid #1D9E75;':''}">
        <div class="day-name">${day}${isTodayCard?' · TODAY':''}</div>
        <div class="day-type"><span class="dot d-${d.dot}"></span>${d.type}</div>
        <div class="day-detail">${formatPlannedSessionDetail(d)}</div>
        ${modifiedBadge}
        ${overlayHTML}
        ${!isRest?`<button class="brief-btn" onclick="briefSession(${w.num},'${day}',event)">Brief this session</button>`:''}
      </div>`;
    }).join('');

    const summaryBar = actualKm > 0
  ? `<div class="week-summary-bar">
      <div class="wsb-item">Planned: <span class="wsb-val">${plannedKm}km</span></div>
      <div class="wsb-item">Logged: <span class="wsb-val" style="color:${plannedKm && actualKm >= plannedKm * 0.9 ? '#1D9E75' : '#EF9F27'}">${actualKm.toFixed(1)}km</span></div>
      <div class="wsb-item">${plannedKm ? Math.round(actualKm / plannedKm * 100) : 0}%</div>
    </div>`
  : '';
    const hamAlert = w.hamstring ? `<div class="hamstring-alert"><strong>Hamstring Protocol Active</strong> — Speed sessions at 4:05–4:10/km. RDL + Nordics prioritised. Dynamic warm-up before every run.</div>` : '';

  // Check for accepted coach modifications this week
  const scheduleMods = JSON.parse(localStorage.getItem('schedule_mods') || '{}');
  const weekMods = scheduleMods[w.num] || [];
  const modsHTML = weekMods.length ? `<div style="margin-bottom:10px;padding:10px 12px;background:var(--blue-light);border-radius:8px;border-left:3px solid #378ADD">
    <div style="font-size:11px;font-family:var(--mono);color:var(--blue);margin-bottom:4px">COACH MODIFICATIONS APPLIED</div>
    ${weekMods.map(m=>`<div style="font-size:12px;color:var(--blue);margin-bottom:2px">• ${m.session}: <span style="text-decoration:line-through;opacity:0.6">${m.original}</span> → <strong>${m.modified}</strong></div>`).join('')}
  </div>` : '';

    const card = document.createElement('div');
    card.className = 'week-card' + (isCurrent?' current-week':'');
    card.innerHTML = `
      <div class="week-header" onclick="toggleWeek(${w.num})">
        <div class="week-left">
          <span class="week-num">WK ${w.num}</span>
          <span class="week-title">${w.label}</span>
          <span class="phase-pill ${pillClass[w.phase]}">${phaseLabel[w.phase]}</span>
          ${isCurrent?'<span class="current-badge">Current</span>':''}
        </div>
        <div class="week-right">
          <span class="week-km" style="font-size:11px;color:var(--text-faint)">${dateStr}</span>
          <span class="week-km">${plannedKm} km</span>
          <span class="week-chevron" id="chev-${w.num}">▼</span>
        </div>
      </div>
      <div class="week-body" id="wb-${w.num}">
        <div class="week-note">${w.note}</div>
        ${totalMismatch ? `<div class="alert alert-amber">Plan total mismatch: week target says ${declaredKm}km, sessions add to ${plannedKm}km. Using session total.</div>` : ''}
        ${modsHTML}
        ${hamAlert}
        <div class="day-grid">${daysHTML}</div>
        ${summaryBar}
      </div>`;
    c.appendChild(card);
  });

  // Auto-open current or first visible week
  if (wkNum) {
    const w = weeks.find(w => w.num === wkNum);
    if (w && (currentFilter === 'all' || w.phase === currentFilter)) toggleWeek(wkNum);
    else { const first = weeks.find(w => currentFilter==='all'||w.phase===currentFilter); if(first) toggleWeek(first.num); }
  } else {
    const first = weeks.find(w => currentFilter==='all'||w.phase===currentFilter);
    if(first) toggleWeek(first.num);
  }
}

function toggleWeek(num) {
  const body = document.getElementById('wb-'+num);
  const chev = document.getElementById('chev-'+num);
  if(!body) return;
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  if(chev) chev.classList.toggle('open', !open);
}

function filterPhase(phase, btn) {
  currentFilter = phase;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderWeeks();
}

// ── AI COACH PAGE ──
const COACH_SYSTEM = `You are a professional running coach helping an athlete train for a sub-42 minute 10km race on 19 July 2026. The training plan starts 27 April 2026 (13 weeks).

ATHLETE: 5km PB 20:50 (4:10/km), HM PB 1:33:30 (4:25/km), Target sub-42:00 (4:11/km), 75kg/188cm, Perth WA.
Current issue: Mid-belly hamstring soreness during speed work — overload protocol active weeks 1-4.

ZONES: Z1-2 Easy 5:30-6:00/km · Z3 Aerobic 4:50-5:10/km · Z4 Threshold 4:20-4:30/km · Z5a Race 4:05-4:15/km · Z5b VO2max 3:55-4:05/km (reduced to 4:05-4:10 wks 1-3)

PLAN: Use the live weekly plan, current week, remaining sessions, activities, check-ins, and strength history supplied in the current context below. Do not rely on old hardcoded weekly volumes.

STYLE: Direct, warm, specific. Give actual paces and reps. Reference the athlete's real data. Build on conversation history — don't repeat yourself. Flag patterns proactively.`;

function renderCoachPage() {
  const el = document.getElementById('page-coach');
  const wkNum = getCurrentWeekNum();
  const day = getCurrentDayOfWeek();
  const w = wkNum ? weeks[wkNum-1] : null;
  const session = w ? w.days[day] : null;
  const daysToRace = Math.ceil((RACE_DATE - new Date()) / 86400000);
  const pct = wkNum ? Math.round((wkNum-1)/13*100) : 0;

  let todayCardHTML;
  if (!wkNum) {
    todayCardHTML = `<div style="font-size:13px;color:var(--text-muted)">Plan starts in ${daysUntilStart()} days. Keep this week easy maintenance.</div>`;
  } else if (!session || session.dot === 'rest') {
    todayCardHTML = `<div style="font-size:13px;color:var(--text-muted)">Rest day. Recovery is training.</div>`;
  } else {
    todayCardHTML = `<div class="today-session"><div class="ts-day">Week ${wkNum} · ${day} · ${new Date().toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div><div class="ts-type">${session.type}</div><div class="ts-detail">${session.detail}</div></div>`;
  }

  el.innerHTML = `
    <div class="page-title">AI Coach</div>
    <p class="page-sub">Your personal running coach. Ask for session briefs, post-run debriefs, motivation, injury advice, or anything about your training.</p>
    <div class="coach-layout">
      <div class="chat-panel">
        <div class="chat-header">
          <div class="coach-avatar">C</div>
          <div><div class="coach-name">Coach</div><div class="coach-status"><span>●</span> Thompson Run Co. · Sub-42 · Race 19 Jul 2026</div></div>
        </div>
        <div class="chat-messages" id="chat-messages">
          ${chatHistory.length === 0 ? `<div class="msg msg-coach"><div class="msg-label">Coach</div><div class="msg-bubble">Hey! I'm your AI running coach for the sub-42 10km build. I've got your full plan, training data, and session history loaded.<br><br>What do you need today?</div></div>` : chatHistory.map(m => `<div class="msg msg-${m.role==='assistant'?'coach':'user'}"><div class="msg-label">${m.role==='assistant'?'Coach':'You'}</div><div class="msg-bubble">${m.content.replace(/\n/g,'<br>')}</div></div>`).join('')}
        </div>
        <div class="quick-prompts">
          <button class="qp-btn" onclick="sendQuick('Brief today\\'s session')">Brief today's session</button>
          <button class="qp-btn" onclick="sendQuick('How is my hamstring protocol going?')">Hamstring check-in</button>
          <button class="qp-btn" onclick="sendQuick('Motivate me')">Motivate me</button>
          <button class="qp-btn" onclick="sendQuick('Race day strategy for sub-42')">Race strategy</button>
        </div>
        <div class="chat-input-area">
          <textarea class="chat-input" id="chat-input" rows="1" placeholder="Ask your coach anything…" onkeydown="handleChatKey(event)" oninput="autoResizeChat(this)"></textarea>
          <button class="send-btn" id="send-btn" onclick="sendMessage()">Send</button>
        </div>
      </div>
      <div class="coach-side">
        <div class="side-card"><div class="side-card-title">Today's Session</div>${todayCardHTML}</div>
        <div class="side-card">
          <div class="side-card-title">Plan Progress</div>
          <div class="stat-row"><span class="stat-label">Current week</span><span class="stat-val">${wkNum||'—'} / 13</span></div>
          <div class="stat-row"><span class="stat-label">Days to race</span><span class="stat-val ${daysToRace<14?'stat-warn':'stat-good'}">${daysToRace}</span></div>
          <div class="stat-row"><span class="stat-label">Phase</span><span class="stat-val">${w?phaseLabel[w.phase]:'Pre-plan'}</span></div>
          <div class="stat-row"><span class="stat-label">Activities</span><span class="stat-val">${activities.length}</span></div>
          ${wkNum?`<div class="progress-bar-wrap"><div class="progress-label"><span>Plan progress</span><span>${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`:''}
        </div>
        <div class="side-card">
          <div class="side-card-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn-secondary" style="width:100%;text-align:left" onclick="sendQuick('Give me a full brief for today\\'s session including warm-up, paces, and what to watch for')">📋 Brief today's session</button>
            <button class="btn-secondary" style="width:100%;text-align:left" onclick="sendQuick('Give me an overview of this week — theme, key sessions, what to focus on')">📅 This week overview</button>
            <button class="btn-secondary" style="width:100%;text-align:left" onclick="sendQuick('Help me debrief my last run — ask me what I did')">🏃 Debrief last run</button>
            <button class="btn-secondary" style="width:100%;text-align:left" onclick="sendQuick('Check in on my hamstring protocol — week ${wkNum||1}, what should I be noticing?')">🦵 Hamstring check-in</button>
            <button class="btn-secondary" style="width:100%;text-align:left" onclick="sendQuick('Full race day strategy for sub-42 — pacing, warm-up, fuelling, mindset')">🏁 Race day strategy</button>
            <button class="btn-secondary" style="width:100%;text-align:left;border-color:var(--red-light);color:var(--red);margin-top:4px" onclick="clearChatHistory()">🗑 Clear chat history</button>
          </div>
        </div>
      </div>
    </div>`;

  // Scroll chat to bottom
  setTimeout(() => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('send-btn');
  const text = input.value.trim();
  if (!text) return;

  appendMessage('user', text);
  chatHistory.push({ role:'user', content: text });
  input.value = ''; input.style.height = 'auto'; btn.disabled = true;

  api.post('chat_history', { role:'user', content: text }, 'return=minimal').catch(()=>{});

  // ── Build rich, unambiguous context ──
  const wkNum = getCurrentWeekNum();
  const day = getCurrentDayOfWeek();
  const w = wkNum ? weeks[wkNum-1] : null;
  const runs = activities.filter(a => !a.sport_type?.includes('Weight') && !a.sport_type?.includes('Ride'));

  // Last 6 runs with planned session comparison and all log entries
  const runHistory = runs.slice(0, 6).map((a, i) => {
    const match = matchActivityToSession(a);
    const planned = match?.planned;
    const actId = String(a.strava_id||a.id);
    const logs = (sessionLogs[actId] || []).map(l => `"${l.note}"`).join('; ');
    const vs = planned && planned.dot !== 'rest'
      ? ` (planned: ${planned.type})` : '';
    return `  ${i===0?'[MOST RECENT] ':''}${a.date}: ${a.sport_type||'Run'} ${a.distance}km @ ${a.pace||'—'}/km${a.average_heartrate?` ♥${Math.round(a.average_heartrate)}bpm`:''}${vs}${logs?' | notes: '+logs:''}`;
  }).join('\n') || '  None yet';

  // Most recent run detail with logs
  const mostRecent = runs[0];
  let mostRecentStr = 'None logged yet';
  if (mostRecent) {
    const match = matchActivityToSession(mostRecent);
    const planned = match?.planned;
    const actId = String(mostRecent.strava_id||mostRecent.id);
    const logs = (sessionLogs[actId] || []).map(l => `"${l.note}"`).join('; ');
    const plannedStr = planned && planned.dot !== 'rest'
      ? `Planned was: ${planned.type} — ${planned.detail}`
      : 'No matching planned session';
    mostRecentStr = `${mostRecent.date} (${mostRecent.name||mostRecent.sport_type||'Run'})
  Distance: ${mostRecent.distance}km | Pace: ${mostRecent.pace||'—'}/km | Time: ${mostRecent.elapsed_time?fmtTime(mostRecent.elapsed_time):'—'} | HR: ${mostRecent.average_heartrate?Math.round(mostRecent.average_heartrate)+'bpm':'—'}
  ${plannedStr}
  Athlete notes: ${logs||'none left'}`;
    }

  // Strength history
  const strengthSummary = strengthLog.slice(0,3).map(e =>
    `  Wk${e.week} ${e.date}: ${(e.exercises||[]).filter(ex=>ex.sets?.some(s=>s.kg||s.reps)).map(ex=>`${ex.name?.split(' ')[0]} ${ex.sets?.reduce((b,s)=>parseFloat(s.kg||0)>parseFloat(b.kg||0)?s:b,{}).kg||'?'}kg`).join(', ')}`
  ).join('\n') || '  None yet';

  // This week progress
  const wkStart = wkNum ? getWeekStartDate(wkNum) : new Date();
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
  const thisWeekRuns = activities.filter(a => {
    const [y,m,d2] = (a.date||'').split('-');
    const dt = new Date(y,m-1,d2);
    return dt >= wkStart && dt <= wkEnd && !a.sport_type?.includes('Weight') && !a.sport_type?.includes('Ride');
  });
  const weekKm = thisWeekRuns.reduce((s,a)=>s+parseFloat(a.distance||0),0).toFixed(1);

  // Today's planned session
  const todaySession = w?.days[day];
  const todayStr = todaySession && todaySession.dot !== 'rest'
    ? `${todaySession.type} — ${todaySession.detail}`
    : 'Rest day';

  // Upcoming sessions this week
  const dayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const todayIdx = dayOrder.indexOf(day);
  const upcomingSessions = w ? dayOrder.slice(todayIdx+1).map(d => {
    const s = w.days[d];
    return s && s.dot !== 'rest' ? `  ${d}: ${s.type} — ${s.detail}` : null;
  }).filter(Boolean).join('\n') : '';

  const latestCheckin = wkNum ? getLatestCheckinForWeek(wkNum) : null;

const checkinStr = latestCheckin
  ? `Fatigue: ${latestCheckin.fatigue_score || '—'}/5
Soreness / niggles: ${latestCheckin.hamstring_score ?? '—'}/5
Sleep: ${latestCheckin.sleep_quality || '—'}
Confidence: ${latestCheckin.confidence_score || '—'}/5
Notes: ${latestCheckin.notes || 'none'}`
  : 'No weekly check-in logged yet.';
  
  const contextSystem = COACH_SYSTEM + `

CURRENT STATE (${new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}):
${wkNum
  ? `Week ${wkNum}/13 · ${w.label} · ${phaseLabel[w.phase]} phase
This week: ${weekKm}km of ${getPlannedWeekKm(w)}km planned (${thisWeekRuns.length} sessions done)
Today's session: ${todayStr}
Days to race: ${Math.ceil((RACE_DATE-new Date())/86400000)}`
  : `Pre-plan — starts in ${daysUntilStart()} days`}

WEEKLY CHECK-IN:
${checkinStr}

MOST RECENT RUN:
${mostRecentStr}

LAST 6 RUNS (newest first):
${runHistory}

REMAINING SESSIONS THIS WEEK:
${upcomingSessions||'  None remaining'}

STRENGTH (last 3 sessions):
${strengthSummary}

COACH INSTRUCTIONS:
- When asked about "my last run" or "my most recent run" — use MOST RECENT RUN above. Do not confuse it with earlier entries.
- Always compare actual vs planned when discussing a completed session.
- If the athlete's notes say they felt hard/easy, factor that into your assessment.
- To modify a session: clearly state the change as "PROPOSED CHANGE: [Day] from [current] → [proposed]" so it can be actioned.
- Be specific — use the actual numbers from their data, not generic advice.`;

  const thinking = showThinking();
  try {
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ system: contextSystem, messages: chatHistory, max_tokens: 900 })
    });
    const data = await res.json();
    thinking.remove();
    const reply = data.content || data.error || 'Something went wrong.';
    chatHistory.push({ role:'assistant', content: reply });

    // Check if reply contains a proposed session change — render as actionable card
    if (reply.includes('PROPOSED CHANGE:')) {
      appendMessageWithProposal(reply);
    } else {
      appendMessage('coach', reply);
    }

    api.post('chat_history', { role:'assistant', content: reply }, 'return=minimal').catch(()=>{});
    if (chatHistory.length > 60) chatHistory = chatHistory.slice(-60);
  } catch(e) {
    thinking.remove();
    appendMessage('coach', 'Network error — check your connection.');
  }
  btn.disabled = false;
}

function appendMessageWithProposal(content) {
  // Split on PROPOSED CHANGE: and render an actionable card for each
  const parts = content.split(/PROPOSED CHANGE:/);
  const preText = parts[0].trim();
  if (preText) appendMessage('coach', preText);

  parts.slice(1).forEach(part => {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    // Try to parse "Day from [X] → [Y]"
    const match = part.match(/^([^\n]+)/);
    const proposalText = match ? match[1].trim() : part.trim();
    const narrative = part.replace(/^[^\n]+\n?/, '').trim();

    const div = document.createElement('div');
    div.className = 'msg msg-coach';
    div.innerHTML = `<div class="msg-label">Coach — Proposed Change</div>
      <div style="border:1px solid #378ADD;border-radius:12px;overflow:hidden;max-width:85%">
        <div style="background:var(--blue-light);padding:10px 14px;font-size:13px;color:var(--blue);font-weight:500">${proposalText}</div>
        ${narrative ? `<div style="padding:10px 14px;font-size:13px;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--border)">${narrative}</div>` : ''}
        <div style="padding:8px 14px;display:flex;gap:8px;border-top:1px solid var(--border)">
          <button onclick="acceptProposal('${proposalText.replace(/'/g,"\\'")}', this)" style="flex:1;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:12px;font-family:var(--sans);font-weight:500;cursor:pointer">✓ Accept</button>
          <button onclick="this.closest('.msg').remove()" style="flex:1;padding:8px;background:transparent;border:1px solid var(--border-strong);border-radius:6px;font-size:12px;font-family:var(--sans);color:var(--text-muted);cursor:pointer">✕ Dismiss</button>
        </div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  });
}

async function acceptProposal(proposalText, btn) {
  btn.textContent = 'Applying…';
  btn.disabled = true;
  // Ask the coach to extract structured data from the proposal text
  try {
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        system: 'Extract session modification details from a proposal. Respond ONLY with JSON: {"week_num": number, "day_name": "Mon|Tue|Wed|Thu|Fri|Sat|Sun", "detail": "new session detail string", "dot": "easy|moderate|hard|rest|strength|race", "distance_km": number_or_null, "reason": "brief reason"}',
        messages: [{ role:'user', content: `Current week: ${getCurrentWeekNum()}. Extract from: "${proposalText}"` }],
        max_tokens: 200
      })
    });
    const data = await res.json();
    const clean = (data.content||'{}').replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);

    if (parsed.week_num && parsed.day_name && parsed.detail) {
      // Apply to local weeks data immediately
      const wIdx = weeks.findIndex(w => w.num === parsed.week_num);
      if (wIdx >= 0 && weeks[wIdx].days[parsed.day_name]) {
        weeks[wIdx].days[parsed.day_name].detail = parsed.detail;
        weeks[wIdx].days[parsed.day_name]._modified = true;
        weeks[wIdx].days[parsed.day_name]._reason = parsed.reason || '';
        if (parsed.dot) weeks[wIdx].days[parsed.day_name].dot = parsed.dot;
      }

      // Save to Supabase
      await fetch('/api/update-session', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(parsed)
      });

      btn.closest('.msg').querySelector('div[style*="display:flex"]').innerHTML =
        `<div style="font-size:12px;color:#1D9E75;padding:4px 0;font-family:var(--mono)">✓ Applied — check your schedule</div>`;

      // Refresh schedule if open
      if (currentPageName === 'schedule') renderSchedulePage();
      appendMessage('coach', `Done — I've updated ${parsed.day_name} Week ${parsed.week_num}. Check your schedule to see the change.`);
    }
  } catch(e) {
    btn.textContent = 'Error — try again';
    btn.disabled = false;
  }
}

function appendMessage(role, content) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `msg msg-${role==='coach'?'coach':'user'}`;
  div.innerHTML = `<div class="msg-label">${role==='coach'?'Coach':'You'}</div><div class="msg-bubble">${content.replace(/\n/g,'<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showThinking() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg msg-coach'; div.id = 'thinking-msg';
  div.innerHTML = `<div class="msg-label">Coach</div><div class="thinking">Thinking<div class="thinking-dots"><span>.</span><span>.</span><span>.</span></div></div>`;
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function sendQuick(text) {
  const input = document.getElementById('chat-input');
  if(input) { input.value = text; sendMessage(); }
}

async function clearChatHistory() {
  if(!confirm('Clear all chat history? The coach will start fresh.')) return;
  try { await api.delete('chat_history', 'id=gt.0'); } catch(e) {}
  chatHistory = [];
  renderCoachPage();
}

function handleChatKey(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }
function autoResizeChat(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function briefSession(weekNum, day, e) {
  e.stopPropagation();
  const w = weeks.find(x=>x.num===weekNum);
  const session = w.days[day];
  const prompt = `Give me a full pre-session brief for Week ${weekNum}, ${day}: ${session.type} — ${session.detail}. Include warm-up tips, key focus points, target paces, and what to watch for.`;
  showPage('coach');
  setTimeout(() => { const input=document.getElementById('chat-input'); if(input){input.value=prompt;sendMessage();} }, 200);
}

// ── ACTIVITIES PAGE ──
function renderActivitiesPage() {
  const el = document.getElementById('page-activities');
  const today = todayISO();
  const wkNum = getCurrentWeekNum();
  const wkStart = wkNum ? getWeekStartDate(wkNum) : new Date();
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
  const thisWeekRuns = activities.filter(a=>{const[y,m,d]=(a.date||'').split('-');const dt=new Date(y,m-1,d);return dt>=wkStart&&dt<=wkEnd&&!a.sport_type?.includes('Weight')&&!a.sport_type?.includes('Strength')&&!a.sport_type?.includes('Ride')&&!a.sport_type?.includes('Cycling');});
  const thisWeekCycles = activities.filter(a=>{const[y,m,d]=(a.date||'').split('-');const dt=new Date(y,m-1,d);return dt>=wkStart&&dt<=wkEnd&&(a.sport_type?.includes('Ride')||a.sport_type?.includes('Cycling'));});
  const thisWeekKm = thisWeekRuns.reduce((s,a)=>s+parseFloat(a.distance||0),0);
  const thisWeekCycleKm = thisWeekCycles.reduce((s,a)=>s+parseFloat(a.distance||0),0);
  const planned = wkNum ? getPlannedWeekKm(weeks[wkNum-1]) : 0;
  const pct = planned > 0 ? Math.min(100, Math.round(thisWeekKm/planned*100)) : 0;

  const activitiesHTML = activities.length ? activities.slice(0,40).map(act => {
    const isStrength = act.sport_type?.includes('Weight') || act.sport_type?.includes('Strength');
    const isCycling = act.sport_type?.includes('Ride') || act.sport_type?.includes('Cycling') || act.sport_type === 'Cycling';
    const isRun = !isStrength && !isCycling;
    const match = isRun ? matchActivityToSession(act) : null;
    const quality = match ? getMatchQuality(act, match.planned) : 'unmatched';
    const badges = {great:'mb-great',ok:'mb-ok',warn:'mb-ok',miss:'mb-miss',unmatched:'mb-unmatched'};
    const badgeText = {great:'On Target',ok:'Close',warn:'Check Pace',miss:'Off Plan',unmatched:'Unmatched'};
    const actId = String(act.strava_id||act.id);
    const note = activityNotes[actId] || '';
    const icon = isStrength ? '🏋️' : isCycling ? '🚴' : '🏃';
    const metaLabel = isStrength ? 'Strength session'
      : isCycling ? 'Cycling'
      : match ? `Wk${match.week} ${match.day} · ${match.planned?.type||'—'}` : 'Outside plan dates';
    const badgeHTML = isStrength
      ? '<span class="match-badge mb-unmatched">🏋️ Strength</span>'
      : isCycling
      ? '<span class="match-badge" style="background:#E3EAF5;color:#1A3260">🚴 Cycling</span>'
      : `<span class="match-badge ${badges[quality]}">${badgeText[quality]}</span>`;
    // Show speed for cycling instead of pace, add HR if available
    const hrBadge = act.average_heartrate ? `<span style="font-size:11px;font-family:var(--mono);color:${act.average_heartrate>160?'#EF9F27':act.average_heartrate>148?'var(--text-muted)':'#1D9E75'};margin-left:4px">♥ ${Math.round(act.average_heartrate)} bpm</span>` : '';
    const statsHTML = isStrength ? '' : `<div class="act-stats">
      <div class="act-stat"><div class="act-stat-val">${act.distance}km</div><div class="act-stat-label">Distance</div></div>
      <div class="act-stat"><div class="act-stat-val">${isCycling && act.average_speed ? (act.average_speed*3.6).toFixed(1)+'km/h' : (act.pace||'—')}</div><div class="act-stat-label">${isCycling?'Avg Speed':'Pace'}</div></div>
      ${act.elapsed_time?`<div class="act-stat"><div class="act-stat-val">${fmtTime(act.elapsed_time)}</div><div class="act-stat-label">Time</div></div>`:''}
    </div>`;
    return `<div class="activity-card">
      <div style="display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center">
        <div class="act-icon" style="${isCycling?'background:#E3EAF5':''}">${icon}</div>
        <div>
          <div class="act-name">${act.name||act.sport_type||'Activity'}</div>
          <div class="act-meta">${fmtDate(act.date)} · ${metaLabel}</div>
          <div style="margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${badgeHTML}
            <span style="font-size:11px;color:var(--strava);font-family:var(--mono);font-weight:500">STRAVA</span>
            ${hrBadge}
          </div>
        </div>
        ${statsHTML}
      </div>
      ${(() => {
        const logs = (sessionLogs[actId] || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        const logsHTML = logs.length
          ? logs.map(l => {
              const ts = new Date(l.created_at);
              const timeStr = ts.toLocaleDateString('en-AU',{day:'numeric',month:'short'}) + ' · ' + ts.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
              return `<div class="log-entry">
                <div class="log-avatar">J</div>
                <div class="log-body"><div class="log-meta">${timeStr}</div><div class="log-text">${l.note}</div></div>
                <button class="log-delete" onclick="deleteSessionLog(${l.id},'${actId}',this)" title="Delete">✕</button>
              </div>`;
            }).join('')
          : `<div class="log-empty">No notes yet</div>`;
        return `<div class="session-log-wrap">
          <div id="log-feed-${actId}">${logsHTML}</div>
          <div class="log-input-row">
            <textarea class="log-textarea" id="log-input-${actId}" rows="1"
              placeholder="${isStrength ? 'How did it feel? PRs? Any niggles?' : 'How did this feel? e.g. HR was high, legs felt dead, pacing felt easy…'}"
              oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\'"
              onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();submitSessionLog(\'${actId}\',\'${isStrength?'strength':'run'}\',\'${act.date||''}\',this)}"
            ></textarea>
            <button class="log-submit" onclick="submitSessionLog(\'${actId}\',\'${isStrength?'strength':'run'}\',\'${act.date||''}\',document.getElementById(\'log-input-${actId}\'))">Post</button>
          </div>
        </div>`;
      })()}
    </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-muted)">No activities yet. Connect Strava to start syncing.</p>';

  el.innerHTML = `
    <div class="page-title">Activities</div>
    <p class="page-sub">Strava activities sync automatically. Add notes to any run — the AI coach can see them.</p>
    <div class="digest-card" style="margin-bottom:20px">
      <div class="digest-header" style="margin-bottom:12px"><div class="digest-title">This Week's Progress</div></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Running</div><div style="font-size:26px;font-family:var(--serif);font-weight:300">${thisWeekKm.toFixed(1)} km</div></div>
        ${thisWeekCycleKm > 0 ? `<div style="text-align:center"><div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Cycling</div><div style="font-size:26px;font-family:var(--serif);font-weight:300">${thisWeekCycleKm.toFixed(1)} km</div></div>` : ''}
        <div style="text-align:right"><div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">Run Target</div><div style="font-size:26px;font-family:var(--serif);font-weight:300">${planned} km</div></div>
      </div>
      <div class="progress-bar-wrap"><div class="progress-label"><span>${pct}% of running target</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>=90?'#1D9E75':pct>=60?'#EF9F27':'#E24B4A'}"></div></div></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="sec-title" style="margin:0">Recent Activities</div>
      <span style="font-size:12px;color:var(--text-muted);font-family:var(--mono)" id="last-updated"></span>
    </div>
    <div id="activities-list">${activitiesHTML}</div>
    <div class="sec-title">Add Activity Manually</div>
    <p class="sec-sub" style="margin-bottom:12px">For activities not on Strava — or if you need to log something manually.</p>
    <div class="setup-card" style="padding:18px;margin-bottom:20px">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr)) auto;gap:10px;align-items:end">
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-family:var(--mono)">DATE</label><input type="date" class="text-input" id="act-date" style="width:100%"></div>
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-family:var(--mono)">DISTANCE (km)</label><input type="number" class="text-input" id="act-dist" placeholder="10.2" step="0.1" style="width:100%"></div>
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-family:var(--mono)">PACE (min:sec)</label><input type="text" class="text-input" id="act-pace" placeholder="4:30" style="width:100%"></div>
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px;font-family:var(--mono)">TYPE</label><select class="text-input" id="act-type" style="width:100%"><option>Easy Run</option><option>Intervals</option><option>Tempo</option><option>Long Run</option><option>Race Simulation</option><option>Cycling</option><option>Strength</option></select></div>
        <button class="btn-primary" onclick="addManualActivity()" style="height:38px">Add</button>
      </div>
    </div>`;
}

async function submitSessionLog(actId, actType, actDate, textarea) {
  const note = textarea.value.trim();
  if (!note) return;
  const btn = textarea.nextElementSibling || textarea.closest('.log-input-row')?.querySelector('.log-submit');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const result = await api.post('session_logs', {
      activity_id: actId,
      activity_type: actType,
      activity_date: actDate || null,
      note
    }, 'return=representation');
    // Add to local state
    if (!sessionLogs[actId]) sessionLogs[actId] = [];
    if (result && result[0]) sessionLogs[actId].unshift(result[0]);
    textarea.value = '';
    textarea.style.height = 'auto';
    // Re-render the feed inline without full page reload
    const feed = document.getElementById('log-feed-' + actId);
    if (feed) {
      const logs = (sessionLogs[actId] || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      feed.innerHTML = logs.map(l => {
        const ts = new Date(l.created_at);
        const timeStr = ts.toLocaleDateString('en-AU',{day:'numeric',month:'short'}) + ' · ' + ts.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
        return `<div class="log-entry">
          <div class="log-avatar">J</div>
          <div class="log-body"><div class="log-meta">${timeStr}</div><div class="log-text">${l.note}</div></div>
          <button class="log-delete" onclick="deleteSessionLog(${l.id},'${actId}',this)" title="Delete">✕</button>
        </div>`;
      }).join('');
    }
  } catch(e) {
    alert('Could not save note: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Post'; }
}

async function deleteSessionLog(logId, actId, btn) {
  if (!confirm('Delete this note?')) return;
  try {
    await api.delete('session_logs', `id=eq.${logId}`);
    if (sessionLogs[actId]) {
      sessionLogs[actId] = sessionLogs[actId].filter(l => l.id !== logId);
    }
    // Remove the entry from DOM directly
    btn.closest('.log-entry').remove();
    // Show empty state if no logs left
    const feed = document.getElementById('log-feed-' + actId);
    if (feed && !feed.querySelector('.log-entry')) {
      feed.innerHTML = '<div class="log-empty">No notes yet</div>';
    }
  } catch(e) {
    alert('Could not delete: ' + e.message);
  }
}

async function saveActivityNote(actId, textarea) {
  // Legacy — redirect to submitSessionLog on Enter
  activityNotes[actId] = textarea.value;
}

async function addManualActivity() {
  const date = document.getElementById('act-date').value;
  const dist = parseFloat(document.getElementById('act-dist').value);
  const pace = document.getElementById('act-pace').value.trim();
  const type = document.getElementById('act-type').value;
  if(!date||!dist||!pace) { alert('Please fill in date, distance, and pace.'); return; }
  const [m,s] = pace.split(':').map(Number);
  const speed = 1000 / (m*60 + (s||0));
  try {
    const result = await api.post('strava_activities', {
      strava_id: Date.now(),
      name: type,
      sport_type: type,
      start_date: date + 'T00:00:00Z',
      distance: dist * 1000,
      pace,
      average_speed: speed,
      elapsed_time: Math.round((m*60+(s||0))*dist),
      moving_time: Math.round((m*60+(s||0))*dist)
    });
    await loadAllData();
    document.getElementById('act-date').value = '';
    document.getElementById('act-dist').value = '';
    document.getElementById('act-pace').value = '';
  } catch(e) { alert('Error saving activity: ' + e.message); }
}

// ── MEALS PAGE ──
function renderMealsPage() {
  const el = document.getElementById('page-meals');
  const today = todayISO();
  const todayMeals = mealLog.filter(m => m.date === today);
  const totals = todayMeals.reduce((t,m)=>({p:t.p+(m.protein||0),c:t.c+(m.carbs||0),f:t.f+(m.fat||0),k:t.k+(m.kcal||0)}),{p:0,c:0,f:0,k:0});
  const typeClass = {Breakfast:'met-breakfast',Snack:'met-snack',Lunch:'met-lunch',Dinner:'met-dinner'};

  const todayHTML = todayMeals.length
    ? todayMeals.map(m=>`<div class="meal-entry">
        <div class="meal-entry-header"><span class="meal-entry-time">${m.time||''}</span><span class="meal-entry-type ${typeClass[m.type]||'met-snack'}">${m.type}</span><button class="meal-delete" onclick="deleteMeal(${m.id})">✕</button></div>
        <div class="meal-entry-text">${m.text}</div>
        <div class="meal-entry-macros"><span><strong>${Math.round(m.protein||0)}g</strong> protein</span><span><strong>${Math.round(m.carbs||0)}g</strong> carbs</span><span><strong>${Math.round(m.fat||0)}g</strong> fat</span><span><strong>${m.kcal||0}</strong> kcal</span></div>
      </div>`).join('')
    : '<p style="font-size:13px;color:var(--text-muted)">No food logged today.</p>';

  const prevMeals = mealLog.filter(m=>m.date!==today);
  const byDate = {};
  prevMeals.forEach(m=>{if(!byDate[m.date])byDate[m.date]=[];byDate[m.date].push(m);});
  const historyHTML = Object.keys(byDate).slice(0,7).map(date=>{
    const meals=byDate[date];
    const t=meals.reduce((acc,m)=>({p:acc.p+(m.protein||0),c:acc.c+(m.carbs||0),k:acc.k+(m.kcal||0)}),{p:0,c:0,k:0});
    return `<div class="st-hist-entry"><div class="st-hist-header" onclick="this.nextElementSibling.classList.toggle('open')"><div><div class="st-hist-date">${fmtDate(date)}</div><div class="st-hist-summary">${meals.length} items · ${Math.round(t.p)}g protein · ${Math.round(t.k)} kcal</div></div><span style="font-size:10px;color:var(--text-faint)">▼</span></div><div class="st-hist-body">${meals.map(m=>`<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--text-faint);font-family:var(--mono)">${m.time||''}</span> <strong>${m.type}</strong> — ${m.text}<div style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">${Math.round(m.protein||0)}g P · ${Math.round(m.carbs||0)}g C · ${Math.round(m.fat||0)}g F · ${m.kcal||0}kcal</div></div>`).join('')}</div></div>`;
  }).join('') || '<p style="font-size:13px;color:var(--text-muted)">No history yet.</p>';

  el.innerHTML = `
    <div class="page-title">Meal Tracker</div>
    <p class="page-sub">Type what you ate — the AI extracts macros automatically. Focus on snacks and problem areas, or track everything. Targets: ~130g protein, ~450g carbs, ~80g fat on training days.</p>
    <div class="meal-input-card">
      <div class="meal-tabs">
        ${['Breakfast','Snack','Lunch','Dinner'].map(t=>`<button class="meal-tab ${currentMealType===t?'active':''}" onclick="selectMealType('${t}',this)">${t}</button>`).join('')}
      </div>
      <textarea class="meal-textarea" id="meal-input" rows="3" placeholder="e.g. banana and peanut butter on 2 slices sourdough toast&#10;or: handful of almonds, apple, protein bar&#10;or: chicken breast 180g, rice 200g, broccoli"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="parsing-indicator" id="meal-parsing" style="display:none">✦ Extracting macros…</div>
        <div></div>
        <button class="meal-log-btn" id="meal-log-btn" onclick="logMeal()">Log →</button>
      </div>
    </div>
    <div class="digest-card">
      <div class="digest-header" style="margin-bottom:12px">
        <div class="digest-title">Today's Macros</div>
        <span style="font-size:12px;color:var(--text-muted)">${new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>
      <div class="macro-bars">
        <div><div class="macro-bar-label"><span>Protein</span><span id="mb-protein">${Math.round(totals.p)} / 130g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-protein" style="width:${Math.min(100,totals.p/130*100).toFixed(0)}%"></div></div></div>
        <div><div class="macro-bar-label"><span>Carbs</span><span id="mb-carbs">${Math.round(totals.c)} / 450g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-carbs" style="width:${Math.min(100,totals.c/450*100).toFixed(0)}%"></div></div></div>
        <div><div class="macro-bar-label"><span>Fat</span><span id="mb-fat">${Math.round(totals.f)} / 80g</span></div><div class="macro-bar-track"><div class="macro-bar-fill mbf-fat" style="width:${Math.min(100,totals.f/80*100).toFixed(0)}%"></div></div></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center">${Math.round(totals.k)} kcal · ${todayMeals.length} item${todayMeals.length!==1?'s':''} logged today</div>
    </div>
    <div class="sec-title" style="margin-top:0">Today's Food Log</div>
    <div id="meal-log-list">${todayHTML}</div>
    <div class="sec-title">Previous Days</div>
    <div id="meal-history-list">${historyHTML}</div>`;
}

function selectMealType(type, btn) {
  currentMealType = type;
  document.querySelectorAll('.meal-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

async function logMeal() {
  const input = document.getElementById('meal-input');
  const text = input.value.trim();
  if(!text) return;
  const btn = document.getElementById('meal-log-btn');
  const parsing = document.getElementById('meal-parsing');
  btn.disabled = true; parsing.style.display = 'block';
  let macros = {protein:0,carbs:0,fat:0,kcal:0};
  try {
    const res = await fetch('/api/parse-meal', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
    macros = await res.json();
  } catch(e) { console.warn('Macro parse failed:', e.message); }

  try {
    const now = new Date();
    await api.post('meal_log', {
      meal_date: todayISO(),
      meal_time: now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),
      meal_type: currentMealType,
      description: text,
      protein_g: Math.round(macros.protein||0),
      carbs_g: Math.round(macros.carbs||0),
      fat_g: Math.round(macros.fat||0),
      kcal: Math.round(macros.kcal||0)
    }, 'return=minimal');
    input.value = '';
    // Reload meal data and re-render
    const meals = await api.get('meal_log','select=*&order=created_at.desc&limit=200');
    mealLog = (meals||[]).map(m=>({id:m.id,date:m.meal_date,time:m.meal_time,type:m.meal_type,text:m.description,protein:m.protein_g,carbs:m.carbs_g,fat:m.fat_g,kcal:m.kcal}));
    renderMealsPage();
  } catch(e) { alert('Error saving meal: '+e.message); }
  btn.disabled = false; parsing.style.display = 'none';
}

async function deleteMeal(id) {
  if(!confirm('Remove this entry?')) return;
  try {
    await api.delete('meal_log', `id=eq.${id}`);
    mealLog = mealLog.filter(m=>m.id!==id);
    renderMealsPage();
  } catch(e) { alert('Error: '+e.message); }
}

// ── STRENGTH PAGE ──
const STRENGTH_P1 = [
  {id:'rdl',name:'Romanian Deadlift (RDL)',target:'3×8 · 3 sec eccentric · controlled',sets:3},
  {id:'bss',name:'Bulgarian Split Squat',target:'3×8 each · smooth control',sets:3},
  {id:'hip',name:'Hip Thrust / Glute Bridge',target:'3×10 · strong lockout',sets:3},
  {id:'curl',name:'Seated or Lying Hamstring Curl',target:'3×10 · controlled return',sets:3},
  {id:'calf',name:'Single-Leg Calf Raise',target:'3×12 each',sets:3},
  {id:'cope',name:'Copenhagen Plank',target:'2×20s each',sets:2},
  {id:'nordic',name:'Assisted Nordic Hamstring Curl',target:'Optional · 2×3 only if no soreness',sets:2}
];

const STRENGTH_P2 = [
  {id:'rdl',name:'Romanian Deadlift (RDL)',target:'4×6–8 · moderate-heavy · controlled eccentric',sets:4},
  {id:'bss',name:'Bulgarian Split Squat',target:'3×8 each · progressive load',sets:3},
  {id:'hip',name:'Hip Thrust',target:'3×8–10 · progressive load',sets:3},
  {id:'curl',name:'Seated or Lying Hamstring Curl',target:'3×8–10 · controlled return',sets:3},
  {id:'calf',name:'Single-Leg Calf Raise',target:'3×12–15 · weighted if tolerated',sets:3},
  {id:'cope',name:'Copenhagen Plank',target:'2–3×30s each',sets:3}
];

const STRENGTH_TAPER = [
  {id:'rdl',name:'Romanian Deadlift (RDL)',target:'2×6 · light/moderate · no soreness',sets:2},
  {id:'bss',name:'Bulgarian Split Squat',target:'2×6 each · light/moderate',sets:2},
  {id:'curl',name:'Hamstring Curl',target:'2×8 · smooth and easy',sets:2},
  {id:'calf',name:'Single-Leg Calf Raise',target:'2×12 each',sets:2},
  {id:'mobility',name:'Mobility / Activation',target:'8–10 min · hips, glutes, calves',sets:1}
];

function getStrengthExercises() {
  const wk = getCurrentWeekNum() || 1;

  if (wk <= 4) return STRENGTH_P1;
  if (wk <= 9) return STRENGTH_P2;
  if (wk <= 12) return STRENGTH_TAPER;

  return [];
}

function renderStrengthPage() {
  const el = document.getElementById('page-strength');
  const exercises = getStrengthExercises();
  const wk = getCurrentWeekNum() || 1;
   const phase = wk<=4
  ? 'Phase 1 · Foundation / Hamstring Capacity'
  : wk<=9
    ? 'Phase 2 · Build / Maintain Strength'
    : wk<=12
      ? 'Phase 3 · Taper / Reduce Soreness'
      : 'Race Week · No Heavy Strength';

  const exerciseInputs = exercises.map(ex => {
    const saved = currentStrengthSession[ex.id] || {};
    const setsHTML = Array.from({length:ex.sets},(_,i)=>{
      const s = saved.sets?.[i] || {};
      return `<div class="st-set-row">
        <div class="st-set-label">${i+1}</div>
        <input class="st-input" type="number" placeholder="kg" step="2.5" value="${s.kg||''}" oninput="saveSetData('${ex.id}',${i},'kg',this.value)">
        <input class="st-input" type="number" placeholder="reps" step="1" value="${s.reps||''}" oninput="saveSetData('${ex.id}',${i},'reps',this.value)">
        <input class="st-input" type="text" placeholder="note" value="${s.note||''}" oninput="saveSetData('${ex.id}',${i},'note',this.value)">
      </div>`;
    }).join('');
    return `<div class="st-exercise">
      <div class="st-ex-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <div><div class="st-ex-name">${ex.name}</div><div class="st-ex-target">${ex.target}</div></div>
        <span style="font-size:10px;color:var(--text-faint)">▼</span>
      </div>
      <div class="st-ex-body">
        <div class="st-set-row" style="margin-bottom:4px"><div></div><div class="st-col-label">Weight (kg)</div><div class="st-col-label">Reps</div><div class="st-col-label">Note</div></div>
        ${setsHTML}
        <textarea class="st-notes" rows="2" placeholder="Notes for this exercise…" oninput="saveExNotes('${ex.id}',this.value)">${saved.notes||''}</textarea>
      </div>
    </div>`;
  }).join('');

  // History
  const histHTML = strengthLog.length ? strengthLog.slice(0,12).map((entry,idx)=>{
    const dateStr = fmtDate(entry.date);
    const logged = (entry.exercises||[]).filter(ex=>ex.sets?.some(s=>s.kg||s.reps));
    const summary = logged.map(ex=>{const top=ex.sets?.reduce((b,s)=>parseFloat(s.kg||0)>parseFloat(b.kg||0)?s:b,{});return `${ex.name?.split(' ')[0]} ${top.kg||''}${top.reps?'×'+top.reps:''}`.trim();}).join(' · ') || 'Logged';
    const detail = (entry.exercises||[]).map(ex=>{
      const filled=(ex.sets||[]).filter(s=>s.kg||s.reps);
      if(!filled.length&&!ex.notes) return '';
      return `<div class="st-hist-ex"><div class="st-hist-ex-name">${ex.name}</div><div class="st-hist-sets">${filled.map((s,i)=>`<div class="st-hist-set">Set ${i+1}: ${s.kg||'?'}kg×${s.reps||'?'}${s.note?' ('+s.note+')':''}</div>`).join('')}</div>${ex.notes?`<div class="st-hist-note">📝 ${ex.notes}</div>`:''}</div>`;
    }).filter(Boolean).join('');
    const sId = String(entry.id || `strength-${entry.date}`);
    const sLogs = (sessionLogs[sId]||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const sLogsHTML = sLogs.length
      ? sLogs.map(l=>{const ts=new Date(l.created_at);const timeStr=ts.toLocaleDateString('en-AU',{day:'numeric',month:'short'})+' · '+ts.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});return `<div class="log-entry"><div class="log-avatar">J</div><div class="log-body"><div class="log-meta">${timeStr}</div><div class="log-text">${l.note}</div></div><button class="log-delete" onclick="deleteSessionLog(${l.id},'${sId}',this)">✕</button></div>`;}).join('')
      : `<div class="log-empty">No notes yet</div>`;
    return `<div class="st-hist-entry">
      <div class="st-hist-header" onclick="toggleStHist(${idx})">
        <div><div class="st-hist-date">Wk ${entry.week} · ${dateStr}</div><div class="st-hist-summary">${summary}</div></div>
        <div style="display:flex;align-items:center;gap:8px"><button class="st-hist-delete" onclick="event.stopPropagation();deleteStrengthEntry(${idx})">✕ Delete</button><span style="font-size:10px;color:var(--text-faint)" id="sth-chev-${idx}">▼</span></div>
      </div>
      <div class="st-hist-body" id="sth-body-${idx}">
        ${detail||'<p style="font-size:12px;color:var(--text-muted);padding-top:8px">No weights recorded.</p>'}
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
          <div style="font-size:11px;font-family:var(--mono);color:var(--text-faint);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Session Notes</div>
          <div id="log-feed-${sId}">${sLogsHTML}</div>
          <div class="log-input-row" style="margin-top:8px">
            <textarea class="log-textarea" id="log-input-${sId}" rows="1" placeholder="How did this session feel? Any PRs or niggles?"
              oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitSessionLog('${sId}','strength','${entry.date}',this)}"></textarea>
            <button class="log-submit" onclick="submitSessionLog('${sId}','strength','${entry.date}',document.getElementById('log-input-${sId}'))">Post</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('') : '<p style="font-size:13px;color:var(--text-muted)">No sessions logged yet.</p>';

  el.innerHTML = `
    <div class="page-title">Strength Plan</div>
    <p class="page-sub">Wednesday sessions, 45–50 minutes. Log each session below — saved to your database automatically.</p>
    <div class="alert alert-amber">Strength is once per week, ideally Tuesday. RDLs and hamstring curls are the main hamstring work. Assisted Nordics are optional only if they do not create soreness. In weeks 10–13, reduce load and avoid heavy eccentric soreness.</div>
    <div class="strength-tracker">
      <div class="st-header">
        <div style="font-size:15px;font-weight:500">📋 Log Today's Session <span style="font-size:12px;color:var(--text-muted);font-weight:400">· ${phase}</span></div>
        <span class="st-saved" id="st-saved-msg">Saved ✓</span>
      </div>
      ${exerciseInputs}
      ${exercises.length
  ? `<button class="st-complete-btn" onclick="completeStrengthSession()">Mark Session Complete</button>`
  : `<div class="alert alert-green">Race week: no heavy strength. Keep this week to light mobility, activation, and walking only.</div>`
}
    </div>
    <div class="sec-title">Session History</div>
    <div id="st-history-list">${histHTML}</div>
    <div class="sec-title">Phase 1 — Base (Weeks 1–4) · Learn + Rehab</div>
    <p class="sec-sub">3×10–12 reps, moderate weight. Master the movements.</p>
    <div class="exercise-list">
      <div class="exercise-row"><div><div class="exercise-name">Romanian Deadlift (RDL)<span class="hsring-badge">hamstring priority</span></div></div><div class="exercise-sets">3×10 · slow eccentric</div><div class="exercise-why">Most important exercise. 3–4s lowering. Start light.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Nordic Hamstring Curl<span class="hsring-badge">hamstring priority</span></div></div><div class="exercise-sets">3×5 (assisted)</div><div class="exercise-why">Best evidence-based hamstring prevention. Anchor feet, assist lowering.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Hip Thrust / Glute Bridge</div></div><div class="exercise-sets">3×12</div><div class="exercise-why">Glute activation. Powers propulsion, reduces hamstring compensation.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Bulgarian Split Squat</div></div><div class="exercise-sets">3×8 each</div><div class="exercise-why">Single-leg quad + glute. Mimics running gait.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Single-Leg Calf Raise</div></div><div class="exercise-sets">3×15 each</div><div class="exercise-why">Achilles and calf resilience.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Copenhagen Plank</div></div><div class="exercise-sets">3×20s each</div><div class="exercise-why">Hip adductor strength.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Dead Bug</div></div><div class="exercise-sets">3×8 each</div><div class="exercise-why">Core stability at speed.</div></div>
    </div>
    <div class="sec-title">Phase 2 — Build (Weeks 5–9) · Load Increase</div>
    <p class="sec-sub">3–4×8 reps, increase load progressively.</p>
    <div class="exercise-list">
      <div class="exercise-row"><div><div class="exercise-name">Romanian Deadlift</div></div><div class="exercise-sets">4×8 · heavier</div><div class="exercise-why">Progressive overload. Controlled eccentric.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Nordic Hamstring Curl</div></div><div class="exercise-sets">3×6–8</div><div class="exercise-why">Build to unassisted reps.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Bulgarian Split Squat</div></div><div class="exercise-sets">4×8 each · heavier</div><div class="exercise-why">Add load with dumbbells or barbell.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Hip Thrust</div></div><div class="exercise-sets">4×10 · heavier</div><div class="exercise-why">Load the glutes progressively.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Single-Leg Calf Raise</div></div><div class="exercise-sets">3×15 · weighted</div><div class="exercise-why">Hold a dumbbell or use the machine.</div></div>
      <div class="exercise-row"><div><div class="exercise-name">Copenhagen Plank</div></div><div class="exercise-sets">3×30s each</div><div class="exercise-why">Extend duration as strength improves.</div></div>
    </div>
    <div class="alert alert-green"><strong>Warm-Up (10 min):</strong> Glute bridges ×15, leg swings ×10 each, lateral band walks ×15, hip 90/90 ×5 each side. <strong>Cool-Down:</strong> Hip flexor stretch, pigeon pose, calf stretch. 60 seconds each.</div>`;
}

function saveSetData(exId, setIdx, field, value) {
  if(!currentStrengthSession[exId]) currentStrengthSession[exId]={sets:[]};
  if(!currentStrengthSession[exId].sets) currentStrengthSession[exId].sets=[];
  if(!currentStrengthSession[exId].sets[setIdx]) currentStrengthSession[exId].sets[setIdx]={};
  currentStrengthSession[exId].sets[setIdx][field]=value;
  localStorage.setItem('strength_session_wip', JSON.stringify(currentStrengthSession));
  flashSaved();
}
function saveExNotes(exId, value) {
  if(!currentStrengthSession[exId]) currentStrengthSession[exId]={};
  currentStrengthSession[exId].notes=value;
  localStorage.setItem('strength_session_wip', JSON.stringify(currentStrengthSession));
  flashSaved();
}
function flashSaved() {
  const el = document.getElementById('st-saved-msg');
  if(!el) return;
  el.classList.add('show');
  clearTimeout(window._savedTimer);
  window._savedTimer = setTimeout(()=>el.classList.remove('show'), 1800);
}

async function completeStrengthSession() {
  const wkNum = getCurrentWeekNum() || 1;
  const exercises = getStrengthExercises().map(ex => ({
    name: ex.name,
    sets: currentStrengthSession[ex.id]?.sets || [],
    notes: currentStrengthSession[ex.id]?.notes || ''
  }));
  try {
    await api.post('strength_sessions', {
      session_date: todayISO(),
      week_num: wkNum,
      exercises
    }, 'return=minimal');
    currentStrengthSession = {};
    localStorage.removeItem('strength_session_wip');
    // Reload strength data
    const sessions = await api.get('strength_sessions','select=*&order=session_date.desc&limit=30');
    strengthLog = (sessions||[]).map(s=>({id:s.id,date:s.session_date,week:s.week_num,exercises:s.exercises||[]}));
    renderStrengthPage();
    alert(`Session logged ✓ — Week ${wkNum} strength session saved.`);
  } catch(e) { alert('Error saving session: '+e.message); }
}

function toggleStHist(idx) {
  const body=document.getElementById('sth-body-'+idx);
  const chev=document.getElementById('sth-chev-'+idx);
  if(!body) return;
  body.classList.toggle('open');
  if(chev) chev.textContent=body.classList.contains('open')?'▲':'▼';
}

async function deleteStrengthEntry(idx) {
  if(!confirm('Delete this strength session?')) return;
  const entry = strengthLog[idx];
  try {
    if(entry.id) await api.delete('strength_sessions',`id=eq.${entry.id}`);
    strengthLog.splice(idx,1);
    renderStrengthPage();
  } catch(e) { alert('Error: '+e.message); }
}

// ── STATIC REFERENCE PAGES ──
function renderPacesPage() {
  document.getElementById('page-paces').innerHTML = `
    <div class="page-title">Training Paces</div>
    <p class="page-sub">Based on 5km PB 20:50 and HM PB 1:33:30. Target race pace for sub-42 is 4:11/km. Run 80% of volume at Z1–2.</p>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table class="data-table" style="min-width:380px">
      <thead><tr><th>Zone</th><th>Name</th><th>Pace/km</th><th>Used For</th></tr></thead>
      <tbody>
        <tr><td><span class="dot d-easy" style="display:inline-block;margin-right:6px"></span>Z1–2</td><td>Easy</td><td class="pace-val">5:30–6:00</td><td>Long runs, warm-up, Monday runs</td></tr>
        <tr><td><span class="dot d-moderate" style="display:inline-block;margin-right:6px"></span>Z3</td><td>Aerobic</td><td class="pace-val">4:50–5:10</td><td>Progression run finishes</td></tr>
        <tr><td><span class="dot d-moderate" style="display:inline-block;margin-right:6px"></span>Z4</td><td>Threshold</td><td class="pace-val">4:20–4:30</td><td>Thursday tempo runs</td></tr>
        <tr><td><span class="dot d-hard" style="display:inline-block;margin-right:6px"></span>Z5a</td><td>10km Race</td><td class="pace-val">4:05–4:15</td><td>Race-pace intervals (phase 2–3)</td></tr>
        <tr><td><span class="dot d-hard" style="display:inline-block;margin-right:6px"></span>Z5b</td><td>VO2max</td><td class="pace-val">3:55–4:05</td><td>Short 400m intervals</td></tr>
        <tr><td><span class="dot d-race" style="display:inline-block;margin-right:6px"></span>Race</td><td>Target</td><td class="pace-val">4:11</td><td>19 July 2026</td></tr>
      </tbody>
    </table>
    </div>
    <div class="alert alert-amber"><strong>Hamstring Modification (Weeks 1–4):</strong> Z5b intervals run at 4:05–4:10/km rather than 3:55–4:05. Never push through a sharp or grabbing sensation.</div>
    <div class="alert alert-green">The 80/20 principle: ~80% of training volume at low intensity (Z1–2), ~20% at high intensity. Hard days only work if easy days are truly easy.</div>`;
}

function renderNutritionPage() {
  document.getElementById('page-nutrition').innerHTML = `
    <div class="page-title">Nutrition</div>
    <p class="page-sub">At 75kg/188cm training 40–55km/week. Track snacks and meals in the Meal Tracker page for real macro data.</p>
    <div class="sec-title">Daily Targets</div>
    <div class="info-grid">
      <div class="info-card"><h4>Training Days</h4><p>Carbs: 5–7g/kg → 375–525g<br>Protein: 1.6–1.8g/kg → 120–135g<br>Fat: 1.0–1.2g/kg → 75–90g<br>~2,800–3,200 kcal</p></div>
      <div class="info-card"><h4>Rest / Easy Days</h4><p>Carbs: 4–5g/kg → 300–375g<br>Protein: 1.6–1.8g/kg → 120–135g<br>Fat: 1.2–1.4g/kg → 90–105g<br>~2,400–2,700 kcal</p></div>
    </div>
    <div class="sec-title">Timing</div>
    <div class="info-grid">
      <div class="info-card"><h4>Pre-Run (1–2 hrs before)</h4><p>50–80g carbs, low fat and fibre. Banana + oats, toast + honey. For early morning: a banana or 2 dates is enough.</p></div>
      <div class="info-card"><h4>During Runs</h4><p>Under 60 min: water only. 60–90 min: 30g carbs/hr. 90+ min: 40–60g carbs/hr from 45 min.</p></div>
      <div class="info-card"><h4>Post-Run (within 30–45 min)</h4><p>20–30g protein + 60–80g carbs. Greek yoghurt + fruit, chocolate milk, rice + chicken.</p></div>
    </div>
    <div class="alert alert-blue">Iron and Vitamin D are the most common deficiencies in distance runners. Consider getting bloods checked if you feel unexpectedly fatigued.</div>`;
}

function renderMethodologyPage() {
  document.getElementById('page-methodology').innerHTML = `
    <div class="page-title">Methodology</div>
    <p class="page-sub">How and why this plan is structured the way it is.</p>
    <div class="sec-title">Phase Structure</div>
    <div class="info-grid">
      <div class="info-card"><h4 style="color:var(--accent)">Phase 1 — Base (Wks 1–4)</h4><p>Gentle return. Weeks 1–2 easy only. Week 3 first quality. Week 4 deload. Let legs adapt without injury risk.</p></div>
      <div class="info-card"><h4 style="color:var(--blue)">Phase 2 — Build (Wks 5–9)</h4><p>Threshold + 10km intervals. Volume builds to 54km peak. 80/20 split maintained.</p></div>
      <div class="info-card"><h4 style="color:var(--amber)">Phase 3 — Peak (Wks 10–11)</h4><p>Race-specific workouts. Race simulation week 11. Volume held, quality increases.</p></div>
      <div class="info-card"><h4 style="color:var(--red)">Phase 4 — Taper (Wks 12–13)</h4><p>Volume drops 30–40%, intensity maintained. Trust the work done.</p></div>
    </div>
    <div class="sec-title">Key Principles</div>
    <div class="timeline">
      <div class="tl-item"><div class="tl-dot" style="background:#1D9E75"></div><div class="tl-title">Never increase volume AND intensity in the same week</div><div class="tl-body">When volume goes up, intensity stays flat. When quality increases, volume holds.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#378ADD"></div><div class="tl-title">80% easy (polarised model)</div><div class="tl-body">Backed by Seiler's research. Hard days are hard, easy days are genuinely easy — not moderate.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#EF9F27"></div><div class="tl-title">Deload every 4th week</div><div class="tl-body">Volume drops ~15%, quality maintained. The body adapts during recovery, not loading.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#E24B4A"></div><div class="tl-title">2-week taper</div><div class="tl-body">Long enough to recover, short enough not to lose fitness. Race-pace sharpness preserved.</div></div>
    </div>
    <div class="alert alert-blue">Using the Riegel formula, your HM PB predicts a 10km of ~42:15 and your 5km PB predicts ~43:10. The HM being faster means your threshold is your biggest lever — hence the emphasis on tempo work.</div>`;
}

function renderHamstringPage() {
  document.getElementById('page-hamstring').innerHTML = `
    <div class="page-title">Injury Management</div>
    <p class="page-sub">Log and manage current injuries or niggles. Active protocol: hamstring overload management.</p>
    <div class="alert alert-amber"><strong>Current Issue — Hamstring Overload:</strong> Mid-belly soreness with a flicking sensation during speed work. Not a strain — a warning signal. The right response is load management and targeted strengthening.</div>
    <div class="sec-title">Current Protocol</div>
    <div class="info-grid">
      <div class="info-card"><h4>Speed Sessions</h4><p>Drop Z5b by 5 sec/km (4:05–4:10 instead of 3:55–4:05). Full speed on under-strength hamstrings is how partial strains happen.</p></div>
      <div class="info-card"><h4>Before Every Run</h4><p>5-min dynamic warm-up: leg swings, slow bodyweight RDL, walking lunges. Non-negotiable until soreness resolves.</p></div>
      <div class="info-card"><h4>Strength Priority</h4><p>RDL first in every session. Nordic curls added. All hamstring work uses 3–4 second eccentric lowering.</p></div>
      <div class="info-card"><h4>After Hard Sessions</h4><p>5 min ice or cold water on back of thigh. Gentle stretch. Hit protein target within 45 min.</p></div>
    </div>
    <div class="alert" style="background:var(--red-light);border-left:3px solid #E24B4A;color:var(--red)"><strong>Stop Immediately If:</strong> A sharp, distinct pull or grab during a run. Walk home, do not run it off. Ice, rest, 48 hours minimum. See a physio if pain persists.</div>
    <div class="sec-title">General Injury Traffic Light</div>
    <div class="info-grid">
      <div class="info-card"><h4 style="color:#1D9E75">🟢 Green — Train normally</h4><p>No pain during or after running. Proceed with the plan as written.</p></div>
      <div class="info-card"><h4 style="color:#EF9F27">🟡 Amber — Modify</h4><p>Mild discomfort (1–3/10) that doesn't worsen during the run. Reduce intensity, skip speed work, consult the AI coach.</p></div>
      <div class="info-card"><h4 style="color:#E24B4A">🔴 Red — Stop</h4><p>Sharp pain, above 4/10, or worsens during the run. Stop immediately. Rest 48 hrs. See a physio if it persists.</p></div>
    </div>
    <div class="sec-title">Dynamic Warm-Up (Every Run)</div>
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr><th>Exercise</th><th>Reps</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Leg swings (forward/back)</td><td>10 each</td><td>Hamstring and hip flexor activation</td></tr>
        <tr><td>Leg swings (side to side)</td><td>10 each</td><td>Hip abductor/adductor preparation</td></tr>
        <tr><td>Slow bodyweight RDL</td><td>8 each</td><td>Lengthens and activates hamstring</td></tr>
        <tr><td>Walking lunges</td><td>10 steps</td><td>Hip flexor + quad activation</td></tr>
        <tr><td>High knees (slow)</td><td>20 steps</td><td>Hip flexor and glute activation</td></tr>
        <tr><td>Butt kicks (slow)</td><td>20 steps</td><td>Hamstring contraction</td></tr>
      </tbody>
    </table>
    </div>`;
}

// ── PWA SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW failed:', e));
  });
}

// ── INIT ──
showPage('dashboard');
loadAllData();

// Auto-refresh data every 60 seconds so new Strava activities appear automatically
setInterval(() => {
  loadAllData();
}, 60000);
