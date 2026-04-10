'use client';

import { useState } from 'react';
import type { GameStateResponse, PlayerRole } from '@/lib/types';

function roleLabel(role: PlayerRole) {
  if (role === 'host') return 'Host';
  if (role === 'seeker') return 'Seeker';
  return 'Hider';
}

export default function LobbyClient({
  initialState,
  session,
}: {
  initialState: GameStateResponse;
  session: { playerId: string; gameId: string; role: PlayerRole; name: string };
}) {
  const [state, setState] = useState(initialState);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function updateRole(playerId: string, role: Exclude<PlayerRole, 'host'>) {
    setBusyId(playerId);
    const res = await fetch(`/api/games/${state.game.id}/players/${playerId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, actorPlayerId: session.playerId }),
    });

    setBusyId(null);
    if (!res.ok) return;
    const next = (await fetch(`/api/games/${state.game.id}/state`, { cache: 'no-store' }).then((r) => r.json())) as GameStateResponse;
    setState(next);
  }

  async function startGame() {
    const res = await fetch(`/api/games/${state.game.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorPlayerId: session.playerId }),
    });

    if (res.ok) {
      window.location.href = `/game/${state.game.id}`;
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.game.code);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 2200);
    }
  }

  const isHost = session.role === 'host';
  const seekerCount = state.players.filter((player) => player.role === 'seeker').length;
  const hiderCount = state.players.filter((player) => player.role === 'hider').length;

  return (
    <div className="page grid two">
      <div className="card stack">
        <div className="badge">Lobby</div>
        <div className="stack lobby-code-card">
          <div className="row">
            <div>
              <div className="muted small">Join code</div>
              <div className="big-code">{state.game.code}</div>
            </div>
            <button className="secondary" onClick={copyCode} type="button">
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy code'}
            </button>
          </div>
          <div className="muted small">
            Share this code with players before the game starts.
          </div>
        </div>
        <div className="grid two">
          <div className="card">
            <div className="muted small">Start radius</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{state.game.start_radius_m} m</div>
          </div>
          <div className="card">
            <div className="muted small">Shrink rate</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{state.game.shrink_per_min} m/min</div>
          </div>
        </div>
        <div className="status-grid">
          <div className="card compact-card">
            <div className="muted small">Seekers</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{seekerCount}</div>
          </div>
          <div className="card compact-card">
            <div className="muted small">Hiders</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{hiderCount}</div>
          </div>
        </div>
        <div className="notice">
          {isHost
            ? 'Assign at least one seeker before starting so teams are clear.'
            : 'Stay on this screen. The host will assign roles and start the round.'}
        </div>
        {isHost ? (
          <button className="primary" onClick={startGame}>Start game</button>
        ) : (
          <div className="badge">Waiting for host to start</div>
        )}
      </div>

      <div className="card stack">
        <div className="row">
          <h2 style={{ margin: 0 }}>Players</h2>
          <div className="badge">{state.players.length}</div>
        </div>

        <div className="stack">
          {state.players.map((player) => (
            <div className="player-row" key={player.id}>
              <div>
                <div style={{ fontWeight: 700 }}>{player.name}</div>
                <div className={`role-pill role-${player.role}`}>{roleLabel(player.role)}</div>
              </div>
              {isHost && player.role !== 'host' ? (
                <div className="row">
                  <button
                    className="secondary"
                    disabled={busyId === player.id || player.role === 'hider'}
                    onClick={() => updateRole(player.id, 'hider')}
                  >
                    Hider
                  </button>
                  <button
                    className="primary"
                    disabled={busyId === player.id || player.role === 'seeker'}
                    onClick={() => updateRole(player.id, 'seeker')}
                  >
                    Seeker
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
