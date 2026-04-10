'use client';

import { useEffect, useState } from 'react';

export type LocationReporterState = {
  accuracy: number | null;
  blocked: boolean;
  hasSynced: boolean;
  status: string;
};

export default function LocationReporter({
  gameId,
  playerId,
  onStateChange,
  requestSignal = 0,
}: {
  gameId: string;
  playerId: string;
  onStateChange?: (state: LocationReporterState) => void;
  requestSignal?: number;
}) {
  const [status, setStatus] = useState('Waiting for location permission');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    onStateChange?.({
      accuracy,
      blocked,
      hasSynced: lastSyncAt !== null,
      status,
    });
  }, [accuracy, blocked, lastSyncAt, onStateChange, status]);

  useEffect(() => {
    if (requestSignal === 0) return;
    if (!navigator.geolocation) {
      setStatus('Geolocation is not available on this device');
      setBlocked(true);
      return;
    }

    setStatus('Requesting location permission...');

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const nextAccuracy = Math.round(position.coords.accuracy);
        setAccuracy(nextAccuracy);
        setBlocked(false);
        setStatus(nextAccuracy <= 30 ? 'Live location is updating' : 'Location is updating, but GPS is a bit weak');

        try {
          const res = await fetch(`/api/games/${gameId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyM: position.coords.accuracy,
            }),
          });
          if (!res.ok) {
            setStatus('Location sync failed');
            return;
          }
          setLastSyncAt(Date.now());
        } catch {
          setStatus('Location sync failed');
        }
      },
      () => {
        setBlocked(true);
        setStatus('Location permission blocked');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gameId, playerId, requestSignal]);

  return (
    <div className="location-card">
      <div className="row">
        <div>
          <div className="small muted">Location status</div>
          <div style={{ fontWeight: 800 }}>{status}</div>
        </div>
        <div className={`signal-pill ${accuracy !== null && accuracy <= 30 ? 'signal-good' : 'signal-warn'}`}>
          {accuracy !== null ? `${accuracy} m` : 'GPS'}
        </div>
      </div>
      <div className="small muted">
        {lastSyncAt ? `Last synced a moment ago` : 'We will start syncing after permission is granted.'}
      </div>
    </div>
  );
}
