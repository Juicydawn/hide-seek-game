import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase';
import { randomCode, slugName, clamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from('games').select('*').eq('code', code.toUpperCase()).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hostName = slugName(body.hostName || '');
    const gameName = slugName(body.gameName || '');
    const areaName = slugName(body.areaName || '');
    const centerLat = Number(body.centerLat);
    const centerLng = Number(body.centerLng);
    const startRadiusM = clamp(Number(body.startRadiusM), 100, 25000);
    const gameLengthMin = clamp(Number(body.gameLengthMin), 5, 480);
    const firstZoneDelayMin = clamp(Number(body.firstZoneDelayMin ?? 15), 1, 180);

    if (!hostName || !gameName) {
      return NextResponse.json({ error: 'Host name and game name are required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    let code = randomCode();
    for (let i = 0; i < 5; i += 1) {
      const { data } = await supabase.from('games').select('id').eq('code', code).maybeSingle();
      if (!data) break;
      code = randomCode();
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        name: gameName,
        status: 'lobby',
        area_name: areaName || null,
        center_lat: centerLat,
        center_lng: centerLng,
        start_radius_m: startRadiusM,
        shrink_per_min: 1,
        game_length_min: gameLengthMin,
        zone_center_lat: centerLat,
        zone_center_lng: centerLng,
        current_radius_m: startRadiusM,
        next_zone_at: new Date(Date.now() + firstZoneDelayMin * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: gameError?.message || 'Failed to create game' }, { status: 500 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: hostName,
        role: 'host',
      })
      .select('*')
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: playerError?.message || 'Failed to create host player' }, { status: 500 });
    }

    await supabase.from('games').update({ host_player_id: player.id }).eq('id', game.id);

    await setSessionCookie({
      playerId: player.id,
      gameId: game.id,
      role: 'host',
      name: player.name,
    });

    return NextResponse.json({ gameId: game.id, code: game.code });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
