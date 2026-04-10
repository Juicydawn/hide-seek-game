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
alter table public.players add column if not exists reveal_until timestamptz;

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
