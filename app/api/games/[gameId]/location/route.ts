import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';
import { getDistanceMeters } from '@/lib/utils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { playerId, lat, lng, accuracyM } = await request.json();

  if (!playerId || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Invalid location payload' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  let { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
  const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();

  if (game?.pending_zone_activate_at && new Date(game.pending_zone_activate_at).getTime() <= Date.now()) {
    const { data: activatedGame } = await supabase
      .from('games')
      .update({
        area_name: game.pending_area_name ?? game.area_name,
        zone_center_lat: game.pending_zone_center_lat ?? game.zone_center_lat ?? game.center_lat,
        zone_center_lng: game.pending_zone_center_lng ?? game.zone_center_lng ?? game.center_lng,
        current_radius_m: game.pending_radius_m ?? game.current_radius_m ?? game.start_radius_m,
        next_zone_at: null,
        pending_area_name: null,
        pending_zone_center_lat: null,
        pending_zone_center_lng: null,
        pending_radius_m: null,
        pending_zone_activate_at: null,
      })
      .eq('id', gameId)
      .select('*')
      .single();
    game = activatedGame ?? game;
  }

  const payload = {
    player_id: playerId,
    game_id: gameId,
    lat,
    lng,
    accuracy_m: typeof accuracyM === 'number' ? accuracyM : null,
    recorded_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('player_locations').insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (player?.role === 'hider' && game) {
    const activeCenterLat = game.zone_center_lat ?? game.center_lat;
    const activeCenterLng = game.zone_center_lng ?? game.center_lng;
    const activeRadiusM = game.current_radius_m ?? game.start_radius_m;
    const outsideActive =
      getDistanceMeters(activeCenterLat, activeCenterLng, lat, lng) > activeRadiusM;

    let nextRevealUntil: string | null = null;
    if (outsideActive && game.pending_zone_center_lat !== null && game.pending_zone_center_lng !== null && game.pending_radius_m !== null) {
      const insidePending =
        getDistanceMeters(game.pending_zone_center_lat, game.pending_zone_center_lng, lat, lng) <= game.pending_radius_m;

      if (insidePending) {
        nextRevealUntil = new Date(Date.now() + 60 * 1000).toISOString();
      }
    }

    if (nextRevealUntil) {
      await supabase.from('players').update({ reveal_until: nextRevealUntil }).eq('id', playerId);
    } else if (player.reveal_until && new Date(player.reveal_until).getTime() <= Date.now()) {
      await supabase.from('players').update({ reveal_until: null }).eq('id', playerId);
    }
  }

  return NextResponse.json({ ok: true });
}
