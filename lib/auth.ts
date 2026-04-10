import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'hide_seek_player';

export type SessionCookie = {
  playerId: string;
  gameId: string;
  role: 'host' | 'seeker' | 'hider';
  name: string;
};

export async function getSessionCookie(): Promise<SessionCookie | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionCookie;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: SessionCookie) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireGameSession(gameId: string) {
  const session = await getSessionCookie();
  if (!session || session.gameId !== gameId) {
    redirect('/');
  }
  return session;
}
