export type GameStatus = 'lobby' | 'active' | 'ended';
export type PlayerRole = 'host' | 'seeker' | 'hider';

export interface Game {
  id: string;
  code: string;
  name: string;
  status: GameStatus;
  area_name: string | null;
  center_lat: number;
  center_lng: number;
  start_radius_m: number;
  shrink_per_min: number;
  game_length_min: number;
  zone_center_lat: number | null;
  zone_center_lng: number | null;
  current_radius_m: number | null;
  next_zone_at: string | null;
  reveal_hiders_until: string | null;
  pending_area_name: string | null;
  pending_zone_center_lat: number | null;
  pending_zone_center_lng: number | null;
  pending_radius_m: number | null;
  pending_zone_activate_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  host_player_id: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  role: PlayerRole;
  reveal_until: string | null;
  joined_at: string;
}

export interface PlayerLocation {
  player_id: string;
  game_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  recorded_at: string;
}

export interface GameStateResponse {
  game: Game;
  players: Player[];
  locations: PlayerLocation[];
  currentRadiusM: number;
  secondsLeft: number;
  secondsUntilPendingZone: number | null;
  revealedPlayerIds: string[];
  revealSecondsByPlayerId: Record<string, number>;
  outsidePlayerIds: string[];
}
