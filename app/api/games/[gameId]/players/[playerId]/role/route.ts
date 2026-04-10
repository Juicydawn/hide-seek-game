import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; playerId: string }> },
) {
  const { gameId, playerId } = await params;
  const { role, actorPlayerId } = await request.json();

  if (!['seeker', 'hider'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: actor } = await supabase.from('players').select('*').eq('id', actorPlayerId).single();
  const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();

  if (!actor || actor.role !== 'host') {
    return NextResponse.json({ error: 'Only the host can change roles' }, { status: 403 });
  }

  if (!game || game.status !== 'lobby') {
    return NextResponse.json({ error: 'Roles are locked after the game starts' }, { status: 403 });
  }

  const { error } = await supabase.from('players').update({ role }).eq('id', playerId).eq('game_id', gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
