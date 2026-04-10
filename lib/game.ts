import { createAdminSupabase } from '@/lib/supabase';
import { getCurrentRadiusM, getDistanceMeters, getSecondsLeft, getSecondsUntil } from '@/lib/utils';
import type { Game, GameStateResponse, Player, PlayerLocation } from '@/lib/types';

async function activatePendingZoneIfDue(game: Game) {
  if (!game.pending_zone_activate_at) return game;
  if (new Date(game.pending_zone_activate_at).getTime() > Date.now()) return game;

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from('games')
    .update({
      area_name: game.pending_area_name ?? game.area_name,
      zone_center_lat: game.pending_zone_center_lat ?? game.zone_center_lat ?? game.center_lat,
      zone_center_lng: game.pending_zone_center_lng ?? game.zone_center_lng ?? game.center_lng,
      current_radius_m: game.pending_radius_m ?? game.current_radius_m ?? game.start_radius_m,
      next_zone_at: null,
      pending_area_name: null,
      pending_zone_center_lat: null,
      pending_zone_center_lng: null,
      pending_radius_m: null,
      pending_zone_activate_at: null,
    })
    .eq('id', game.id)
    .select('*')
    .single<Game>();

  if (error || !data) {
    throw error ?? new Error('Failed to activate pending zone');
  }

  return data;
}

export async function fetchGameByCode(code: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single<Game>();

  if (error) throw error;
  return data;
}

export async function fetchGameState(gameId: string): Promise<GameStateResponse> {
  const supabase = createAdminSupabase();

  const [{ data: game, error: gameError }, { data: players, error: playersError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single<Game>(),
      supabase.from('players').select('*').eq('game_id', gameId).order('joined_at', { ascending: true }).returns<Player[]>(),
      supabase
        .from('player_locations_latest')
        .select('*')
        .eq('game_id', gameId)
        .returns<PlayerLocation[]>(),
    ]);

  if (gameError) throw gameError;
  if (playersError) throw playersError;
  if (locationsError) throw locationsError;

  const currentGame = await activatePendingZoneIfDue(game);
  const currentPlayers = players ?? [];
  const currentLocations = locations ?? [];

  const currentRadiusM = getCurrentRadiusM(currentGame.current_radius_m, currentGame.start_radius_m);
  const zoneCenterLat = currentGame.zone_center_lat ?? currentGame.center_lat;
  const zoneCenterLng = currentGame.zone_center_lng ?? currentGame.center_lng;
  const outsidePlayerIds =
    currentLocations
      ?.filter((location) => getDistanceMeters(zoneCenterLat, zoneCenterLng, location.lat, location.lng) > currentRadiusM)
      .map((location) => location.player_id) ?? [];
  const now = Date.now();
  const hiderIds = new Set(currentPlayers.filter((player) => player.role === 'hider').map((player) => player.id));
  const revealedByZoneIds =
    currentGame.pending_zone_center_lat !== null &&
    currentGame.pending_zone_center_lng !== null &&
    currentGame.pending_radius_m !== null
      ? currentLocations
          .filter((location) => {
            if (!hiderIds.has(location.player_id)) return false;
            const outsideActive = getDistanceMeters(zoneCenterLat, zoneCenterLng, location.lat, location.lng) > currentRadiusM;
            const insidePending =
              getDistanceMeters(
                currentGame.pending_zone_center_lat!,
                currentGame.pending_zone_center_lng!,
                location.lat,
                location.lng,
              ) <= currentGame.pending_radius_m!;
            return outsideActive && !insidePending;
          })
          .map((location) => location.player_id)
      : outsidePlayerIds.filter((playerId) => hiderIds.has(playerId));
  const revealedPlayerIds = Array.from(
    new Set([
      ...revealedByZoneIds,
      ...currentPlayers
        .filter((player) => player.reveal_until && new Date(player.reveal_until).getTime() > now)
        .map((player) => player.id),
    ]),
  );
  const revealSecondsByPlayerId = Object.fromEntries(
    currentPlayers
      .filter((player) => player.reveal_until)
      .map((player) => [player.id, getSecondsUntil(player.reveal_until)])
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0),
  );

  return {
    game: currentGame,
    players: currentPlayers,
    locations: currentLocations,
    currentRadiusM,
    secondsLeft: getSecondsLeft(currentGame.game_length_min, currentGame.started_at),
    secondsUntilPendingZone: getSecondsUntil(currentGame.pending_zone_activate_at),
    revealedPlayerIds,
    revealSecondsByPlayerId,
    outsidePlayerIds,
  };
}
