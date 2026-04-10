'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameStateResponse } from '@/lib/types';

export default function HostZoneControls({
  state,
  actorPlayerId,
  onStateChange,
}: {
  state: GameStateResponse;
  actorPlayerId: string;
  onStateChange: (state: GameStateResponse) => void;
}) {
  const [areaName, setAreaName] = useState(state.game.pending_area_name ?? state.game.area_name ?? '');
  const [radiusM, setRadiusM] = useState(String(state.game.pending_radius_m ?? state.currentRadiusM));
  const [centerLat, setCenterLat] = useState(String(state.game.pending_zone_center_lat ?? state.game.zone_center_lat ?? state.game.center_lat));
  const [centerLng, setCenterLng] = useState(String(state.game.pending_zone_center_lng ?? state.game.zone_center_lng ?? state.game.center_lng));
  const [activationDelayMin, setActivationDelayMin] = useState('15');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const remoteSnapshot = useMemo(
    () =>
      JSON.stringify({
        areaName: state.game.pending_area_name ?? state.game.area_name ?? '',
        radiusM: state.game.pending_radius_m ?? state.currentRadiusM,
        centerLat: state.game.pending_zone_center_lat ?? state.game.zone_center_lat ?? state.game.center_lat,
        centerLng: state.game.pending_zone_center_lng ?? state.game.zone_center_lng ?? state.game.center_lng,
      }),
    [state],
  );

  useEffect(() => {
    if (isDirty) return;
    setAreaName(state.game.pending_area_name ?? state.game.area_name ?? '');
    setRadiusM(String(state.game.pending_radius_m ?? state.currentRadiusM));
    setCenterLat(String(state.game.pending_zone_center_lat ?? state.game.zone_center_lat ?? state.game.center_lat));
    setCenterLng(String(state.game.pending_zone_center_lng ?? state.game.zone_center_lng ?? state.game.center_lng));
  }, [isDirty, remoteSnapshot, state]);

  async function applyZoneUpdate() {
    setLoading(true);
    setMessage('');

    const res = await fetch(`/api/games/${state.game.id}/zone`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorPlayerId,
        areaName,
        radiusM: Number(radiusM),
        centerLat: Number(centerLat),
        centerLng: Number(centerLng),
        activationDelayMin: Number(activationDelayMin),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Zone update failed' }));
      setMessage(body.error || 'Zone update failed');
      return;
    }

    const nextState = (await fetch(`/api/games/${state.game.id}/state`, { cache: 'no-store' }).then((response) =>
      response.json(),
    )) as GameStateResponse;
    setIsDirty(false);
    onStateChange(nextState);
    setMessage('Zone updated');
  }

  return (
    <div className="stack host-zone-panel">
      <label className="stack">
        <span>New zone name</span>
        <input
          value={areaName}
          onChange={(event) => {
            setAreaName(event.target.value);
            setIsDirty(true);
          }}
          placeholder="City Hall square"
        />
      </label>
      <div className="grid two">
        <label className="stack">
          <span>New zone radius in meters</span>
          <input
            value={radiusM}
            onChange={(event) => {
              setRadiusM(event.target.value);
              setIsDirty(true);
            }}
            inputMode="numeric"
          />
        </label>
        <label className="stack">
          <span>Activate new zone in minutes</span>
          <input
            value={activationDelayMin}
            onChange={(event) => {
              setActivationDelayMin(event.target.value);
              setIsDirty(true);
            }}
            inputMode="numeric"
          />
        </label>
      </div>
      <div className="grid two">
        <label className="stack">
          <span>Center latitude</span>
          <input
            value={centerLat}
            onChange={(event) => {
              setCenterLat(event.target.value);
              setIsDirty(true);
            }}
          />
        </label>
        <label className="stack">
          <span>Center longitude</span>
          <input
            value={centerLng}
            onChange={(event) => {
              setCenterLng(event.target.value);
              setIsDirty(true);
            }}
          />
        </label>
      </div>
      <div className="notice">
        Players will see the announced zone immediately on the map. When the timer ends, it replaces the current active zone.
      </div>
      {message ? <div className="badge">{message}</div> : null}
      <button className="primary" disabled={loading} onClick={applyZoneUpdate} type="button">
        {loading ? 'Scheduling zone...' : 'Apply upcoming zone'}
      </button>
    </div>
  );
}
