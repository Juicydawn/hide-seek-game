import { NextResponse } from 'next/server';
import { fetchGameState } from '@/lib/game';

export async function GET(_: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const state = await fetchGameState(gameId);
  return NextResponse.json(state);
}
