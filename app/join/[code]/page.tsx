'use client';

import { useEffect, useState } from 'react';

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const [code, setCode] = useState('');
  const [game, setGame] = useState<any>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => setCode(p.code.toUpperCase()));
  }, [params]);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/games?code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGame(data);
      })
      .catch(() => setError('Game not found'));
  }, [code]);

  async function joinGame(event: React.FormEvent) {
    event.preventDefault();
    if (!game) return;
    setLoading(true);
    setError('');

    const res = await fetch(`/api/games/${game.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Join failed');
      return;
    }

    window.location.href = `/game/${game.id}`;
  }

  return (
    <main className="page">
      <section className="card stack">
        <div className="badge">Join game</div>
        <h1 style={{ margin: 0 }}>{game?.name || `Code ${code}`}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {game ? `Status: ${game.status}` : 'Loading game'}
        </p>
        {error ? <div className="badge" style={{ color: '#ffb4b4' }}>{error}</div> : null}
        {game ? (
          <form className="stack" onSubmit={joinGame}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            <div className="notice">You will join the lobby first, then wait for the host to start the round.</div>
            <button className="primary" disabled={loading}>{loading ? 'Joining...' : 'Join game'}</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
