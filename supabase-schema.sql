-- Run this entire file in your Supabase SQL Editor
-- It's safe to run multiple times (uses IF NOT EXISTS)

-- Strava activities (you may already have this)
create table if not exists strava_activities (
  id bigserial primary key,
  strava_id bigint unique not null,
  name text,
  sport_type text,
  start_date timestamptz,
  distance float,
  elapsed_time int,
  moving_time int,
  average_speed float,
  pace text,
  max_speed float,
  average_heartrate float,
  max_heartrate float,
  total_elevation_gain float,
  created_at timestamptz default now()
);

-- Activity notes (run feel, observations)
create table if not exists activity_notes (
  id bigserial primary key,
  activity_id text unique not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Strength sessions
create table if not exists strength_sessions (
  id bigserial primary key,
  session_date date not null,
  week_num int,
  exercises jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Meal log
create table if not exists meal_log (
  id bigserial primary key,
  meal_date date not null,
  meal_time text,
  meal_type text,
  description text not null,
  protein_g float default 0,
  carbs_g float default 0,
  fat_g float default 0,
  kcal int default 0,
  created_at timestamptz default now()
);

-- Chat history
create table if not exists chat_history (
  id bigserial primary key,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table strava_activities enable row level security;
alter table activity_notes enable row level security;
alter table strength_sessions enable row level security;
alter table meal_log enable row level security;
alter table chat_history enable row level security;

-- Public read/write policies (single user app, no auth needed)
-- These let the app read and write using the anon key
do $$ begin
  -- strava_activities
  if not exists (select 1 from pg_policies where tablename='strava_activities' and policyname='public read') then
    create policy "public read" on strava_activities for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='strava_activities' and policyname='service insert') then
    create policy "service insert" on strava_activities for insert with check (true);
  end if;
  -- activity_notes
  if not exists (select 1 from pg_policies where tablename='activity_notes' and policyname='anon all') then
    create policy "anon all" on activity_notes for all using (true) with check (true);
  end if;
  -- strength_sessions
  if not exists (select 1 from pg_policies where tablename='strength_sessions' and policyname='anon all') then
    create policy "anon all" on strength_sessions for all using (true) with check (true);
  end if;
  -- meal_log
  if not exists (select 1 from pg_policies where tablename='meal_log' and policyname='anon all') then
    create policy "anon all" on meal_log for all using (true) with check (true);
  end if;
  -- chat_history
  if not exists (select 1 from pg_policies where tablename='chat_history' and policyname='anon all') then
    create policy "anon all" on chat_history for all using (true) with check (true);
  end if;
end $$;

-- Add pace column to existing strava_activities if missing
alter table strava_activities add column if not exists pace text;
