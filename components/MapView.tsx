'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, Polygon } from 'geojson';
import type { GameStateResponse, PlayerRole } from '@/lib/types';

function circlePolygon(center: [number, number], radiusM: number, points = 72): Feature<Polygon> {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;

  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusM * Math.cos(angle);
    const dy = radiusM * Math.sin(angle);
    const pointLat = lat + (dy / earthRadius) * (180 / Math.PI);
    const pointLng = lng + (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([pointLng, pointLat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export default function MapView({
  state,
  playerId,
  role,
  editZoneMode = false,
  onZoneCenterSelect,
}: {
  state: GameStateResponse;
  playerId: string;
  role: PlayerRole;
  editZoneMode?: boolean;
  onZoneCenterSelect?: (coords: { lat: number; lng: number }) => void;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const editZoneModeRef = useRef(editZoneMode);
  const onZoneCenterSelectRef = useRef(onZoneCenterSelect);
  const zoneCenterLat = state.game.zone_center_lat ?? state.game.center_lat;
  const zoneCenterLng = state.game.zone_center_lng ?? state.game.center_lng;

  useEffect(() => {
    editZoneModeRef.current = editZoneMode;
    onZoneCenterSelectRef.current = onZoneCenterSelect;
  }, [editZoneMode, onZoneCenterSelect]);

  const visibleLocations = useMemo(() => {
    if (role === 'host') return state.locations;
    if (role === 'seeker') {
      const revealedPlayerIds = new Set(state.revealedPlayerIds);
      return state.locations.filter((loc) => {
        if (loc.player_id === playerId) return true;
        if (revealedPlayerIds.has(loc.player_id)) return true;
        return false;
      });
    }
    return state.locations.filter((loc) => loc.player_id === playerId);
  }, [playerId, role, state.locations, state.revealedPlayerIds]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: LngLatLike = [zoneCenterLng, zoneCenterLat];
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
      center,
      zoom: 13,
    });

    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right',
    );

    map.on('load', () => {
      map.addSource('zone', {
        type: 'geojson',
        data: circlePolygon([zoneCenterLng, zoneCenterLat], state.currentRadiusM),
      });
      map.addSource('pending-zone', {
        type: 'geojson',
        data:
          state.game.pending_zone_center_lat !== null &&
          state.game.pending_zone_center_lng !== null &&
          state.game.pending_radius_m !== null
            ? circlePolygon(
                [state.game.pending_zone_center_lng, state.game.pending_zone_center_lat],
                state.game.pending_radius_m,
              )
            : { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'zone-fill',
        type: 'fill',
        source: 'zone',
        paint: {
          'fill-color': '#65b5ff',
          'fill-opacity': 0.18,
        },
      });

      map.addLayer({
        id: 'zone-line',
        type: 'line',
        source: 'zone',
        paint: {
          'line-color': '#65b5ff',
          'line-width': 3,
        },
      });

      map.addLayer({
        id: 'pending-zone-fill',
        type: 'fill',
        source: 'pending-zone',
        paint: {
          'fill-color': '#ffd166',
          'fill-opacity': 0.08,
        },
      });

      map.addLayer({
        id: 'pending-zone-line',
        type: 'line',
        source: 'pending-zone',
        paint: {
          'line-color': '#ffd166',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });
    });

    map.on('click', (event) => {
      if (!editZoneModeRef.current || !onZoneCenterSelectRef.current) return;
      onZoneCenterSelectRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('zone') as maplibregl.GeoJSONSource | undefined;
    source?.setData(circlePolygon([zoneCenterLng, zoneCenterLat], state.currentRadiusM));
    const pendingSource = map.getSource('pending-zone') as maplibregl.GeoJSONSource | undefined;
    pendingSource?.setData(
      state.game.pending_zone_center_lat !== null &&
        state.game.pending_zone_center_lng !== null &&
        state.game.pending_radius_m !== null
        ? circlePolygon(
            [state.game.pending_zone_center_lng, state.game.pending_zone_center_lat],
            state.game.pending_radius_m,
          )
        : { type: 'FeatureCollection', features: [] },
    );

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const loc of visibleLocations) {
      const player = state.players.find((p) => p.id === loc.player_id);
      const el = document.createElement('div');
      el.className = 'player-marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '999px';
      el.style.border = '2px solid white';
      el.style.background =
        player?.role === 'host' ? '#ffd166' : player?.role === 'seeker' ? '#ff6b6b' : '#52d49d';
      if (state.revealedPlayerIds.includes(loc.player_id)) {
        el.style.boxShadow = '0 0 0 4px rgba(255, 107, 107, 0.22)';
      }
      const revealLeft = state.revealSecondsByPlayerId[loc.player_id];

      const marker = new maplibregl.Marker({ element: el }).setLngLat([loc.lng, loc.lat]).setPopup(
        new maplibregl.Popup({ offset: 10 }).setHTML(
          `<strong>${player?.name ?? 'Player'}</strong><br/>${player?.role ?? 'unknown'}${state.revealedPlayerIds.includes(loc.player_id) ? '<br/>Revealed' : ''}${revealLeft ? `<br/>Reveal left: ${revealLeft}s` : ''}`,
        ),
      ).addTo(map);

      markersRef.current.push(marker);
    }
  }, [state, visibleLocations, zoneCenterLat, zoneCenterLng]);

  return <div ref={mapContainerRef} className="map" />;
}
