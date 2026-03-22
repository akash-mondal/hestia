'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

interface UseMapboxOptions {
  center: [number, number];
  zoom: number;
  style?: string;
  pitch?: number;
  bearing?: number;
  interactive?: boolean;
}

export function useMapboxMap(options: UseMapboxOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: options.style || 'mapbox://styles/mapbox/satellite-streets-v12',
      center: options.center,
      zoom: options.zoom,
      pitch: options.pitch ?? 0,
      bearing: options.bearing ?? 0,
      interactive: options.interactive ?? true,
      fadeDuration: 0,
    });

    map.on('style.load', () => {
      // Hide most labels for cleaner satellite view
      try {
        for (const layer of map.getStyle().layers) {
          if (layer.type === 'symbol' && layer.id.includes('label')) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      } catch { /* some styles may not have symbol layers */ }
      setLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, map: mapRef.current, loaded };
}
