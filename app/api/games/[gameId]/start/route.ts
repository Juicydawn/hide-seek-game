import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { actorPlayerId } = await request.json();
  const supabase = createAdminSupabase();

  const { data: player } = await supabase.from('players').select('*').eq('id', actorPlayerId).single();
  if (!player || player.role !== 'host') {
    return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
  const nextZoneAt = game?.next_zone_at ?? new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('games')
    .update({ status: 'active', started_at: now, next_zone_at: nextZoneAt })
    .eq('id', gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
