'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FacilityRegistration, ComplianceEvaluation } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface FacilityMapProps {
  facilities: FacilityRegistration[];
  evaluations: ComplianceEvaluation[];
}

function getStatus(fid: string, evals: ComplianceEvaluation[]): string {
  const fe = evals.filter(e => e.facilityId === fid);
  if (fe.length === 0) return 'mixed';
  const latest = fe.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())[0];
  return latest.overallCompliant ? 'compliant' : 'violation';
}

const COLORS: Record<string, string> = { compliant: '#059669', violation: '#DC2626', mixed: '#D97706' };

export default function FacilityMap({ facilities, evaluations }: FacilityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || facilities.length === 0) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [80.35, 26.45],
      zoom: 6,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: facilities
          .filter(f => f.gpsLatitude && f.gpsLongitude)
          .map(f => {
            const status = getStatus(f.facilityId, evaluations);
            return {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [f.gpsLongitude, f.gpsLatitude] },
              properties: {
                id: f.facilityId, name: f.facilityName,
                industry: f.industryCategory || 'Industrial',
                status, color: COLORS[status],
              },
            };
          }),
      };

      map.addSource('facilities', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'facility-glow', type: 'circle', source: 'facilities',
        paint: { 'circle-radius': 18, 'circle-color': ['get', 'color'], 'circle-opacity': 0.12, 'circle-blur': 1 },
      });

      map.addLayer({
        id: 'facility-dots', type: 'circle', source: 'facilities',
        paint: { 'circle-radius': 8, 'circle-color': ['get', 'color'], 'circle-opacity': 0.9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      });

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '240px' });

      map.on('click', 'facility-dots', (e) => {
        if (e.features?.[0]?.properties?.id) window.location.href = `/facilities/${e.features[0].properties.id}`;
      });

      map.on('mouseenter', 'facility-dots', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (f?.geometry.type === 'Point' && f.properties) {
          const label = f.properties.status === 'compliant' ? '✓ Compliant' : f.properties.status === 'violation' ? '✗ Violation' : '⚠ Pending';
          popup.setLngLat(f.geometry.coordinates as [number, number])
            .setHTML(`<div style="font-family:var(--font-sans);font-size:12px;padding:6px 2px">
              <strong style="font-size:11px;font-family:var(--font-mono)">${f.properties.id}</strong><br/>
              <span style="color:var(--text-secondary)">${f.properties.name || f.properties.industry}</span><br/>
              <span style="color:${f.properties.color};font-weight:600;font-size:11px">${label}</span>
              <br/><span style="color:var(--accent);font-size:10px;cursor:pointer">View Details →</span>
            </div>`)
            .addTo(map);
        }
      });
      map.on('mouseleave', 'facility-dots', () => { map.getCanvas().style.cursor = ''; popup.remove(); });

      if (geojson.features.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        geojson.features.forEach(f => { if (f.geometry.type === 'Point') bounds.extend(f.geometry.coordinates as [number, number]); });
        map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    });

    return () => { map.remove(); };
  }, [facilities, evaluations]);

  return (
    <div className="card overflow-hidden h-full">
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="label">GPI Locations</span>
        <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#059669' }} /> Compliant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} /> Violation</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} /> Pending</span>
        </div>
      </div>
      <div ref={containerRef} style={{ minHeight: 420 }} />
    </div>
  );
}
