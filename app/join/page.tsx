'use client';

import { useState } from 'react';

export default function JoinIndexPage() {
  const [code, setCode] = useState('');

  return (
    <main className="page">
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `/join/${code.toUpperCase()}`;
        }}
      >
        <div className="badge">Join</div>
        <h1 style={{ margin: 0 }}>Enter a game code</h1>
        <p className="muted" style={{ margin: 0 }}>
          Use the code from the host screen. Lowercase is fine, we will convert it for you.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="K8F2Q"
          required
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button className="primary">Continue</button>
      </form>
    </main>
  );
}
