import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';
import { createAdminSupabase } from '@/lib/supabase';
import { slugName } from '@/lib/utils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const body = await request.json();
  const name = slugName(body.name || '');

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: game, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.status !== 'lobby') {
    return NextResponse.json({ error: 'Game already started. New joins are locked.' }, { status: 403 });
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      name,
      role: 'hider',
    })
    .select('*')
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: playerError?.message || 'Failed to join game' }, { status: 500 });
  }

  await setSessionCookie({
    playerId: player.id,
    gameId,
    role: 'hider',
    name: player.name,
  });

  return NextResponse.json({ ok: true, playerId: player.id });
}
