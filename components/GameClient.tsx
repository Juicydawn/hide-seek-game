'use client';

import { useEffect, useState } from 'react';
import HostZoneControls from '@/components/HostZoneControls';
import LocationReporter, { type LocationReporterState } from '@/components/LocationReporter';
import MapView from '@/components/MapView';
import type { GameStateResponse, PlayerRole } from '@/lib/types';

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function formatCountdown(seconds: number | null) {
  if (seconds === null) return 'Host decides';
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

export default function GameClient({
  initialState,
  gameId,
  playerId,
  role,
}: {
  initialState: GameStateResponse;
  gameId: string;
  playerId: string;
  role: PlayerRole;
}) {
  const [state, setState] = useState(initialState);
  const [editZoneMode, setEditZoneMode] = useState(false);
  const [locationRequestCount, setLocationRequestCount] = useState(role === 'host' ? 1 : 0);
  const [locationState, setLocationState] = useState<LocationReporterState>({
    accuracy: null,
    blocked: false,
    hasSynced: role === 'host',
    status: role === 'host' ? 'Host mode' : 'Waiting for location permission',
  });

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const res = await fetch(`/api/games/${gameId}/state`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as GameStateResponse;
      setState(data);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [gameId]);

  const playersLeft = state.players.filter((player) => player.role === 'hider').length;
  const seekers = state.players.filter((player) => player.role === 'seeker');
  const hiders = state.players.filter((player) => player.role === 'hider');
  const canPlay = role === 'host' || locationState.hasSynced;

  return (
    <div className="game-layout">
      <div className="game-map-card">
        <MapView
          state={state}
          playerId={playerId}
          role={role}
          editZoneMode={role === 'host' && editZoneMode}
          onZoneCenterSelect={(coords) => {
            if (role !== 'host') return;
            setState((current) => ({
              ...current,
              game: {
                ...current.game,
                pending_zone_center_lat: coords.lat,
                pending_zone_center_lng: coords.lng,
              },
            }));
          }}
        />
        {!canPlay ? (
          <div className="map-blocker">
            <div className="panel stack blocker-card">
              <div className="badge">Location Required</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Share your location to join the round.</div>
              <div className="muted">
                Players cannot take part until their device is sending live position updates.
              </div>
              <div className="notice">
                {locationState.blocked
                  ? 'Location permission is blocked. Allow location in your browser settings and return to the game.'
                  : locationState.status}
              </div>
              <button className="primary" onClick={() => setLocationRequestCount((current) => current + 1)} type="button">
                {locationState.blocked ? 'Try location again' : 'Enable location'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="game-dock">
        <div className="game-dock-header">
          <div>
            <div className="small muted">Area</div>
            <div style={{ fontWeight: 900, fontSize: 24 }}>{state.game.area_name || state.game.name}</div>
          </div>
          <div className={`role-pill role-${role}`}>{role}</div>
        </div>

        <div className="hud-metrics dock-metrics">
          <div className="mini-stat">
            <div className="small muted">Time left</div>
            <div className="stat-value">{formatTime(state.secondsLeft)}</div>
          </div>
          <div className="mini-stat">
            <div className="small muted">Upcoming zone</div>
            <div className="stat-value">{formatCountdown(state.secondsUntilPendingZone)}</div>
          </div>
          <div className="mini-stat">
            <div className="small muted">Players left</div>
            <div className="stat-value">{playersLeft}</div>
          </div>
          <div className="mini-stat">
            <div className="small muted">Radius</div>
            <div className="stat-value">{state.currentRadiusM} m</div>
          </div>
        </div>

        <div className="game-dock-grid">
          <div className="stack">
            <div className="panel stack compact-panel">
              <div className="row">
                <div>
                  <div className="small muted">Zone intel</div>
                  <div style={{ fontWeight: 800 }}>
                    {state.game.pending_zone_activate_at
                      ? `${state.game.pending_area_name || 'Upcoming zone'} activates in ${formatCountdown(state.secondsUntilPendingZone)}`
                      : 'No upcoming zone announced'}
                  </div>
                </div>
              </div>
              <div className="notice strong-notice">
                {role === 'host'
                  ? 'When you apply a new zone, everyone sees it immediately and gets the countdown until it takes over.'
                  : role === 'seeker'
                    ? 'Seekers see hiders who are caught outside the active zone. If those hiders reach the upcoming zone, their reveal lasts one more minute.'
                    : 'Hiders should move toward the upcoming zone before it activates. If you are revealed, seekers can see your countdown too.'}
              </div>
              <LocationReporter
                gameId={gameId}
                playerId={playerId}
                onStateChange={setLocationState}
                requestSignal={locationRequestCount}
              />
            </div>

            {role === 'host' ? (
              <div className="panel stack compact-panel">
                <div className="row">
                  <div>
                    <div className="small muted">Host controls</div>
                    <div style={{ fontWeight: 800 }}>Manage the active play zone</div>
                  </div>
                  <button
                    className={`secondary ${editZoneMode ? 'active-toggle' : ''}`}
                    onClick={() => setEditZoneMode((current) => !current)}
                    type="button"
                  >
                    {editZoneMode ? 'Stop placing zone' : 'Pick zone on map'}
                  </button>
                </div>
                <HostZoneControls
                  state={state}
                  actorPlayerId={playerId}
                  onStateChange={(nextState) => {
                    setState(nextState);
                    setEditZoneMode(false);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="stack">
            <div className="panel stack compact-panel">
              <div className="row">
                <div style={{ fontWeight: 800 }}>Seekers</div>
                <div className="badge">{seekers.length}</div>
              </div>
              <div className="team-list">
                {seekers.map((player) => (
                  <div className="team-row" key={player.id}>
                    <span>{player.name}</span>
                    <span className="role-pill role-seeker">Seeker</span>
                  </div>
                ))}
                {seekers.length === 0 ? <div className="muted small">No seekers assigned yet.</div> : null}
              </div>
            </div>

            <div className="panel stack compact-panel">
              <div className="row">
                <div style={{ fontWeight: 800 }}>Hiders</div>
                <div className="badge">{hiders.length}</div>
              </div>
              <div className="team-list">
                {hiders.map((player) => (
                  <div className="team-row" key={player.id}>
                    <span>{player.name}</span>
                    <div className="team-row-tags">
                      {state.revealedPlayerIds.includes(player.id) ? (
                        <span className="role-pill role-seeker">
                          {state.revealSecondsByPlayerId[player.id]
                            ? `Revealed ${formatCountdown(state.revealSecondsByPlayerId[player.id])}`
                            : 'Revealed'}
                        </span>
                      ) : null}
                      <span className="role-pill role-hider">Hider</span>
                    </div>
                  </div>
                ))}
                {hiders.length === 0 ? <div className="muted small">No hiders in the round.</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
