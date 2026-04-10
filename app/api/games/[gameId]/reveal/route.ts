import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { actorPlayerId } = await request.json();
  const supabase = createAdminSupabase();

  const { data: actor } = await supabase.from('players').select('*').eq('id', actorPlayerId).single();
  if (!actor || actor.role !== 'host') {
    return NextResponse.json({ error: 'Only the host can reveal hiders' }, { status: 403 });
  }

  const revealUntil = new Date(Date.now() + 60 * 1000).toISOString();
  const { error } = await supabase.from('games').update({ reveal_hiders_until: revealUntil }).eq('id', gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, revealUntil });
}
