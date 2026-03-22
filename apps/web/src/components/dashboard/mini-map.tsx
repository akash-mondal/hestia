'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FacilityRegistration, ComplianceEvaluation } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MiniMapProps {
  facilities: FacilityRegistration[];
  evaluations: ComplianceEvaluation[];
}

function getComplianceStatus(facilityId: string, evaluations: ComplianceEvaluation[]): 'compliant' | 'violation' | 'mixed' {
  const evals = evaluations.filter(e => e.facilityId === facilityId);
  if (evals.length === 0) return 'mixed';
  const latest = evals.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())[0];
  return latest.overallCompliant ? 'compliant' : 'violation';
}

const STATUS_COLORS: Record<string, string> = { compliant: '#059669', violation: '#DC2626', mixed: '#D97706' };

export default function MiniMap({ facilities, evaluations }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || facilities.length === 0) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [80.35, 26.45],
      zoom: 5.5,
      interactive: true,
      attributionControl: false,
    });

    map.scrollZoom.disable();

    map.on('load', () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: facilities
          .filter(f => f.gpsLatitude && f.gpsLongitude)
          .map(f => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [f.gpsLongitude, f.gpsLatitude] },
            properties: { id: f.facilityId, name: f.facilityName, status: getComplianceStatus(f.facilityId, evaluations), color: STATUS_COLORS[getComplianceStatus(f.facilityId, evaluations)] },
          })),
      };

      map.addSource('facilities', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'facility-glow', type: 'circle', source: 'facilities',
        paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': 0.15, 'circle-blur': 1 },
      });

      map.addLayer({
        id: 'facility-dots', type: 'circle', source: 'facilities',
        paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-opacity': 0.9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      });

      map.on('click', 'facility-dots', (e) => {
        if (e.features?.[0]?.properties?.id) window.location.href = `/facilities/${e.features[0].properties.id}`;
      });

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
      map.on('mouseenter', 'facility-dots', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (f?.geometry.type === 'Point' && f.properties) {
          const label = f.properties.status === 'compliant' ? '✓ Compliant' : f.properties.status === 'violation' ? '✗ Violation' : '⚠ Pending';
          popup.setLngLat(f.geometry.coordinates as [number, number])
            .setHTML(`<div style="font-family:var(--font-mono);font-size:11px;padding:4px 0"><strong>${f.properties.id}</strong><br/><span style="color:${f.properties.color}">${label}</span></div>`)
            .addTo(map);
        }
      });
      map.on('mouseleave', 'facility-dots', () => { map.getCanvas().style.cursor = ''; popup.remove(); });

      if (geojson.features.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        geojson.features.forEach(f => { if (f.geometry.type === 'Point') bounds.extend(f.geometry.coordinates as [number, number]); });
        map.fitBounds(bounds, { padding: 40, maxZoom: 10 });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); };
  }, [facilities, evaluations]);

  return (
    <div className="card overflow-hidden h-full">
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="label">GPI Locations — Ganga Basin</span>
        <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#059669' }} /> Compliant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} /> Violation</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} /> Pending</span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 380 }} />
    </div>
  );
}
