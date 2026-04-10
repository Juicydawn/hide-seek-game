import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';
import { clamp, slugName } from '@/lib/utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { actorPlayerId, areaName, radiusM, centerLat, centerLng, activationDelayMin } = await request.json();
  const supabase = createAdminSupabase();

  const { data: actor } = await supabase.from('players').select('*').eq('id', actorPlayerId).single();
  if (!actor || actor.role !== 'host') {
    return NextResponse.json({ error: 'Only the host can change the zone' }, { status: 403 });
  }

  const nextZoneAt = new Date(Date.now() + clamp(Number(activationDelayMin), 1, 180) * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('games')
    .update({
      pending_area_name: slugName(areaName || ''),
      pending_radius_m: clamp(Number(radiusM), 100, 25000),
      pending_zone_center_lat: Number(centerLat),
      pending_zone_center_lng: Number(centerLng),
      pending_zone_activate_at: nextZoneAt,
    })
    .eq('id', gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
