create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null check (status in ('lobby', 'active', 'ended')) default 'lobby',
  area_name text,
  center_lat double precision not null,
  center_lng double precision not null,
  start_radius_m integer not null,
  shrink_per_min integer not null,
  game_length_min integer not null,
  zone_center_lat double precision,
  zone_center_lng double precision,
  current_radius_m integer,
  next_zone_at timestamptz,
  reveal_hiders_until timestamptz,
  pending_area_name text,
  pending_zone_center_lat double precision,
  pending_zone_center_lng double precision,
  pending_radius_m integer,
  pending_zone_activate_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  host_player_id uuid
);

alter table public.games add column if not exists area_name text;
alter table public.games add column if not exists zone_center_lat double precision;
alter table public.games add column if not exists zone_center_lng double precision;
alter table public.games add column if not exists current_radius_m integer;
alter table public.games add column if not exists next_zone_at timestamptz;
alter table public.games add column if not exists reveal_hiders_until timestamptz;
alter table public.games add column if not exists pending_area_name text;
alter table public.games add column if not exists pending_zone_center_lat double precision;
alter table public.games add column if not exists pending_zone_center_lng double precision;
alter table public.games add column if not exists pending_radius_m integer;
alter table public.games add column if not exists pending_zone_activate_at timestamptz;

update public.games
set
  area_name = coalesce(area_name, ''),
  zone_center_lat = coalesce(zone_center_lat, center_lat),
  zone_center_lng = coalesce(zone_center_lng, center_lng),
  current_radius_m = coalesce(current_radius_m, start_radius_m)
where
  area_name is null
  or zone_center_lat is null
  or zone_center_lng is null
  or current_radius_m is null;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  role text not null check (role in ('host', 'seeker', 'hider')),
  reveal_until timestamptz,
  joined_at timestamptz not null default now()
);

alter table public.players add column if not exists reveal_until timestamptz;

alter table public.games
  add constraint games_host_player_id_fkey
  foreign key (host_player_id) references public.players(id)
  on delete set null;

create table if not exists public.player_locations (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_players_game on public.players(game_id);
create index if not exists idx_locations_game_time on public.player_locations(game_id, recorded_at desc);
create index if not exists idx_locations_player_time on public.player_locations(player_id, recorded_at desc);

create or replace view public.player_locations_latest as
select distinct on (player_id)
  player_id,
  game_id,
  lat,
  lng,
  accuracy_m,
  recorded_at
from public.player_locations
order by player_id, recorded_at desc;

alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.player_locations enable row level security;

create policy "allow anon read games" on public.games for select using (true);
create policy "allow anon insert games" on public.games for insert with check (true);
create policy "allow anon update games" on public.games for update using (true);

create policy "allow anon read players" on public.players for select using (true);
create policy "allow anon insert players" on public.players for insert with check (true);
create policy "allow anon update players" on public.players for update using (true);

create policy "allow anon read locations" on public.player_locations for select using (true);
create policy "allow anon insert locations" on public.player_locations for insert with check (true);
