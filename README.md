# City Hide and Seek

A Next.js starter for a live hide and seek game with a shrinking map zone.

## What this starter does

- Host creates a game and gets a join code.
- Players join with the code before the game starts.
- Host promotes players to seeker or leaves them as hider.
- Host starts the game. New joins are locked after this point.
- Players see a live map on their phone.
- The map shows a shrinking circular zone.
- Hiders see only themselves.
- Seekers see themselves and other seekers.
- Host sees everyone.

## Tech stack

- Next.js App Router
- Route Handlers for server endpoints
- Supabase Postgres for game state
- MapLibre GL JS for the map

## Setup

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in your Supabase keys.
5. Install packages.
6. Run the app.

```bash
npm install
npm run dev
```

## Notes

- Use HTTPS in production, or phone geolocation will fail in many browsers.
- This starter uses a secure cookie to keep a joined player in the game after refresh.
- Location sync uses browser geolocation and writes points to the database.
- The live map refreshes every 3 seconds.

## Good next upgrades

- Realtime channels instead of polling.
- Elimination rules.
- Out of zone warnings.
- Host admin map with filters.
- Invite links.
- Team colors.
- Audit logs for game actions.
- Better anti cheat checks.
