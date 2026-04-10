'use client';

import { useState } from 'react';
import ZonePickerMap from '@/components/ZonePickerMap';

export default function HostPage() {
  const [form, setForm] = useState({
    hostName: '',
    gameName: 'Friday Night Hunt',
    areaName: 'Inner City',
    centerLat: '55.6761',
    centerLng: '12.5683',
    startRadiusM: '2500',
    firstZoneDelayMin: '15',
    gameLengthMin: '90',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: form.hostName,
        gameName: form.gameName,
        areaName: form.areaName,
        centerLat: Number(form.centerLat),
        centerLng: Number(form.centerLng),
        startRadiusM: Number(form.startRadiusM),
        firstZoneDelayMin: Number(form.firstZoneDelayMin),
        gameLengthMin: Number(form.gameLengthMin),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to create game' }));
      setError(body.error || 'Failed to create game');
      return;
    }

    const data = await res.json();
    window.location.href = `/game/${data.gameId}`;
  }

  function updateCenter(coords: { lat: number; lng: number }) {
    setForm((current) => ({
      ...current,
      centerLat: coords.lat.toFixed(5),
      centerLng: coords.lng.toFixed(5),
    }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setError('Could not read your current location'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <main className="page grid two">
      <section className="card stack">
        <div className="badge">Host setup</div>
        <h1 style={{ margin: 0 }}>Create a game</h1>
        <p className="muted" style={{ margin: 0 }}>
          Pick the starting zone on the map, give the area a name, and choose when the first host-managed zone update should happen.
        </p>
        <div className="row">
          <button className="secondary" onClick={useMyLocation} type="button">Use my location</button>
        </div>
        <ZonePickerMap
          centerLat={Number(form.centerLat)}
          centerLng={Number(form.centerLng)}
          radiusM={Number(form.startRadiusM)}
          onChange={updateCenter}
        />
      </section>

      <form className="card stack" onSubmit={onSubmit}>
        <label className="stack">
          <span>Host name</span>
          <input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} required />
        </label>
        <label className="stack">
          <span>Game name</span>
          <input value={form.gameName} onChange={(e) => setForm({ ...form, gameName: e.target.value })} required />
        </label>
        <label className="stack">
          <span>Area name</span>
          <input value={form.areaName} onChange={(e) => setForm({ ...form, areaName: e.target.value })} required />
        </label>
        <div className="grid two">
          <label className="stack">
            <span>Center latitude</span>
            <input value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} required />
          </label>
          <label className="stack">
            <span>Center longitude</span>
            <input value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} required />
          </label>
        </div>
        <div className="grid two">
          <label className="stack">
            <span>Start radius in meters</span>
            <input value={form.startRadiusM} onChange={(e) => setForm({ ...form, startRadiusM: e.target.value })} required />
          </label>
          <label className="stack">
            <span>First zone change in minutes</span>
            <input value={form.firstZoneDelayMin} onChange={(e) => setForm({ ...form, firstZoneDelayMin: e.target.value })} required />
          </label>
        </div>
        <label className="stack">
          <span>Game length in minutes</span>
          <input value={form.gameLengthMin} onChange={(e) => setForm({ ...form, gameLengthMin: e.target.value })} required />
        </label>
        {error ? <div className="badge" style={{ color: '#ffb4b4' }}>{error}</div> : null}
        <button className="primary" disabled={loading}>{loading ? 'Creating...' : 'Create game'}</button>
      </form>
    </main>
  );
}
