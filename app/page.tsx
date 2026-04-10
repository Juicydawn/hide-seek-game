import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page grid">
      <section className="hero">
        <div className="badge">City Hide and Seek</div>
        <h1 style={{ margin: 0, fontSize: 44 }}>Run a real world hide and seek game on phones.</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
          Create a lobby. Share a code. Promote seekers. Lock the game when it starts. Show a shrinking zone on a live map.
        </p>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <Link className="primary" href="/host">Host a game</Link>
          <Link className="secondary" href="/join">Join a game</Link>
        </div>
      </section>
    </main>
  );
}
