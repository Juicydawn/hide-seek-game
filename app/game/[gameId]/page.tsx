import GameClient from '@/components/GameClient';
import LobbyClient from '@/components/LobbyClient';
import { requireGameSession } from '@/lib/auth';
import { fetchGameState } from '@/lib/game';

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const session = await requireGameSession(gameId);
  const state = await fetchGameState(gameId);

  if (state.game.status === 'lobby') {
    return <LobbyClient initialState={state} session={session} />;
  }

  return <GameClient initialState={state} gameId={gameId} playerId={session.playerId} role={session.role} />;
}
