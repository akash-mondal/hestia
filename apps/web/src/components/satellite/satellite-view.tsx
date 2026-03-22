'use client';

import { useState, useEffect, useRef } from 'react';
import { Satellite, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FacilityRegistration, SensorReading } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWthc2gxZWtlIiwiYSI6ImNtbXhjNDJ0cTJvNzUycXIwYmV0cmR2dGcifQ.Nzhna6_Lyaesv5cLBg0qsQ';

interface SatelliteViewProps {
  facilities: FacilityRegistration[];
  readings: SensorReading[];
}

interface SatelliteResult {
  facilityId: string;
  ocemsTss: number;
  satelliteTss: number | null;
  correlation: number | null;
  validated: boolean;
  error?: string;
}

export default function SatelliteView({ facilities, readings }: SatelliteViewProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, SatelliteResult>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Initialize Mapbox satellite map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [80.35, 26.45],
      zoom: 7,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Add facility markers
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: facilities
          .filter(f => f.gpsLatitude && f.gpsLongitude)
          .map(f => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [f.gpsLongitude, f.gpsLatitude] },
            properties: { id: f.facilityId, name: f.facilityName },
          })),
      };

      map.addSource('facilities', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'facility-dots', type: 'circle', source: 'facilities',
        paint: { 'circle-radius': 8, 'circle-color': '#06B6D4', 'circle-opacity': 0.9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
      });

      if (geojson.features.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        geojson.features.forEach(f => { if (f.geometry.type === 'Point') bounds.extend(f.geometry.coordinates as [number, number]); });
        map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); };
  }, [facilities]);

  // Fetch satellite validation data
  const handleFetch = async () => {
    setLoading(true);
    setFetchError(null);
    const newResults: Record<string, SatelliteResult> = {};

    try {
      for (const f of facilities) {
        const latestReading = readings
          .filter(r => r.facilityId === f.facilityId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (!latestReading || !f.gpsLatitude || !f.gpsLongitude) continue;

        try {
          const res = await fetch(`/api/satellite?action=validate&facility_id=${f.facilityId}&lat=${f.gpsLatitude}&lon=${f.gpsLongitude}&ocems_tss_mg_l=${latestReading.TSS_mgL}`);
          if (res.ok) {
            const data = await res.json();
            newResults[f.facilityId] = {
              facilityId: f.facilityId,
              ocemsTss: latestReading.TSS_mgL,
              satelliteTss: data.satellite_tss ?? data.turbidity ?? null,
              correlation: data.correlation ?? data.agreement ?? null,
              validated: data.validated ?? data.corroborated ?? false,
            };
          } else {
            newResults[f.facilityId] = {
              facilityId: f.facilityId,
              ocemsTss: latestReading.TSS_mgL,
              satelliteTss: null, correlation: null, validated: false,
              error: 'API error',
            };
          }
        } catch {
          newResults[f.facilityId] = {
            facilityId: f.facilityId,
            ocemsTss: latestReading.TSS_mgL,
            satelliteTss: null, correlation: null, validated: false,
            error: 'Connection failed',
          };
        }
      }
      setResults(newResults);

      // If ALL failed, show a global error
      const allFailed = Object.values(newResults).every(r => r.error);
      if (allFailed && Object.keys(newResults).length > 0) {
        setFetchError('Satellite API unavailable — ESA Sentinel-2 data requires the satellite service to be running');
      }
    } catch {
      setFetchError('Failed to connect to satellite validation service');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Cross-validates OCEMS sensor data against ESA Copernicus Sentinel-2 Level-2A imagery.
        </p>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-surface)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching...' : 'Fetch Satellite Data'}
        </button>
      </div>

      {fetchError && (
        <div className="px-4 py-3 rounded-lg text-xs" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning)' }}>
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6" style={{ minHeight: 420 }}>
        {/* Satellite map */}
        <div className="col-span-3 card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <Satellite size={14} style={{ color: 'var(--accent)' }} />
            <span className="label">Sentinel-2 Coverage — Ganga Basin</span>
          </div>
          <div ref={mapContainerRef} style={{ height: 380 }} />
        </div>

        {/* Cross-validation results */}
        <div className="col-span-2 card overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="label">Cross-Validation Results</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {facilities.map(f => {
              const latestReading = readings
                .filter(r => r.facilityId === f.facilityId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              const result = results[f.facilityId];

              return (
                <div key={f.facilityId} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold mono" style={{ color: 'var(--accent)' }}>
                      {f.facilityId}
                    </span>
                    {result ? (
                      result.error ? (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--warning)' }}>
                          <AlertTriangle size={10} /> Unavailable
                        </span>
                      ) : result.validated ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--compliant)' }}>
                          <CheckCircle2 size={10} /> Corroborated
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--violation)' }}>
                          <XCircle size={10} /> Anomaly
                        </span>
                      )
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {loading ? 'Fetching...' : 'Not fetched'}
                      </span>
                    )}
                  </div>

                  {latestReading && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div style={{ color: 'var(--text-tertiary)' }}>
                        <span>OCEMS TSS</span>
                        <div className="mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                          {latestReading.TSS_mgL.toFixed(1)} mg/L
                        </div>
                      </div>
                      {result && result.satelliteTss !== null && (
                        <div style={{ color: 'var(--text-tertiary)' }}>
                          <span>Satellite TSS</span>
                          <div className="mono font-bold" style={{ color: result.validated ? 'var(--compliant)' : 'var(--violation)' }}>
                            {result.satelliteTss.toFixed(1)} mg/L
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {result && result.correlation !== null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>Correlation</span>
                        <span className="mono">{(result.correlation * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(result.correlation * 100, 100)}%`,
                            background: result.validated ? 'var(--compliant)' : 'var(--violation)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {facilities.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No facilities registered</span>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            Source: Copernicus Sentinel-2 L2A (ESA) via Google Earth Engine
          </div>
        </div>
      </div>
    </div>
  );
}
