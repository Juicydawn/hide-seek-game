export function randomCode(length = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export function slugName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getCurrentRadiusM(currentRadiusM: number | null | undefined, startRadiusM: number) {
  return currentRadiusM ?? startRadiusM;
}

export function getSecondsLeft(gameLengthMin: number, startedAt: string | null) {
  if (!startedAt) return gameLengthMin * 60;
  const endMs = new Date(startedAt).getTime() + gameLengthMin * 60 * 1000;
  return Math.max(0, Math.round((endMs - Date.now()) / 1000));
}

export function getSecondsUntil(dateValue: string | null) {
  if (!dateValue) return null;
  return Math.max(0, Math.round((new Date(dateValue).getTime() - Date.now()) / 1000));
}

export function getDistanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const earthRadius = 6371000;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const deltaLat = ((bLat - aLat) * Math.PI) / 180;
  const deltaLng = ((bLng - aLng) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
