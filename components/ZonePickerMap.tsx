'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, Polygon } from 'geojson';

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

export default function ZonePickerMap({
  centerLat,
  centerLng,
  radiusM,
  onChange,
}: {
  centerLat: number;
  centerLng: number;
  radiusM: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const didAutoFitRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
      center: [centerLng, centerLat],
      zoom: 13,
    });

    map.on('load', () => {
      map.addSource('zone-preview', {
        type: 'geojson',
        data: circlePolygon([centerLng, centerLat], radiusM),
      });

      map.addLayer({
        id: 'zone-preview-fill',
        type: 'fill',
        source: 'zone-preview',
        paint: {
          'fill-color': '#65b5ff',
          'fill-opacity': 0.16,
        },
      });

      map.addLayer({
        id: 'zone-preview-line',
        type: 'line',
        source: 'zone-preview',
        paint: {
          'line-color': '#65b5ff',
          'line-width': 3,
        },
      });
    });

    map.on('click', (event) => {
      onChangeRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    markerRef.current = new maplibregl.Marker({ color: '#ffd166', draggable: true })
      .setLngLat([centerLng, centerLat])
      .addTo(map);

    markerRef.current.on('dragend', () => {
      const next = markerRef.current?.getLngLat();
      if (!next) return;
      onChangeRef.current({ lat: next.lat, lng: next.lng });
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !map.isStyleLoaded()) return;

    marker.setLngLat([centerLng, centerLat]);

    const source = map.getSource('zone-preview') as maplibregl.GeoJSONSource | undefined;
    source?.setData(circlePolygon([centerLng, centerLat], radiusM));

    if (!didAutoFitRef.current) {
      map.easeTo({ center: [centerLng, centerLat], duration: 500 });
      didAutoFitRef.current = true;
    }
  }, [centerLat, centerLng, radiusM]);

  return <div ref={containerRef} className="picker-map" />;
}
