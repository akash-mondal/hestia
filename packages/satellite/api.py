"""
Zeno Satellite Cross-Validation API

FastAPI service providing satellite-derived water quality data for
cross-validation of OCEMS sensor readings. Powers the dashboard's
satellite overlay and trust chain evidence.

Three-Pillar Integrity Model:
  1. OCEMS (ground truth — but tamper-prone)
  2. Blockchain (tamper resistance — KMS + HCS)
  3. Satellite (independent corroboration — unfalsifiable)

Endpoints:
  GET  /water-quality          — Point query with indices + spatial context
  GET  /facility/{facility_id} — Pre-configured facility with upstream/downstream
  GET  /time-series            — Historical NDTI trend for a location
  GET  /health                 — Service health check
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional

import ee
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from water_quality import (
    mask_clouds,
    compute_indices,
    extract_point_values,
    extract_spatial_context,
    get_best_image,
    get_image_metadata,
    KANPUR_POINTS,
)

# ─── GEE Initialization ──────────────────────────────────────────────

def init_gee():
    """Initialize Google Earth Engine with service account credentials."""
    key_path = os.environ.get(
        'GEE_SERVICE_ACCOUNT_KEY_PATH',
        os.path.join(os.path.dirname(__file__), '..', '..', 'gee-service-account.json')
    )

    if not os.path.exists(key_path):
        raise RuntimeError(f'GEE service account key not found: {key_path}')

    with open(key_path) as f:
        key_data = json.load(f)

    project_id = os.environ.get('GEE_PROJECT_ID', key_data.get('project_id'))
    service_account = key_data.get('client_email')

    credentials = ee.ServiceAccountCredentials(service_account, key_path)
    ee.Initialize(credentials, project=project_id)
    print(f'  GEE initialized: project={project_id}, account={service_account}')


# Initialize once at startup
init_gee()

# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title='Zeno Satellite API',
    description='Sentinel-2 water quality cross-validation for OCEMS compliance',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # Dashboard needs cross-origin access
    allow_methods=['GET'],
    allow_headers=['*'],
)

# ─── In-Memory Cache ─────────────────────────────────────────────────
# Satellite data is immutable — cache aggressively
_cache: dict[str, dict] = {}


def cache_key(lat: float, lon: float, date: str, endpoint: str, spatial: bool = False) -> str:
    return f'{endpoint}:{"s" if spatial else "p"}:{lat:.4f}:{lon:.4f}:{date}'


# ─── Endpoints ────────────────────────────────────────────────────────

@app.get('/health')
def health():
    """Service health check — verifies GEE connection."""
    try:
        # Quick GEE connectivity test
        ee.Number(1).getInfo()
        return {
            'status': 'healthy',
            'gee': 'connected',
            'facilities_configured': len(KANPUR_POINTS),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        }
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


@app.get('/water-quality')
def water_quality(
    lat: float = Query(..., description='Latitude (e.g., 26.40 for Kanpur Jajmau)'),
    lon: float = Query(..., description='Longitude (e.g., 80.40 for Kanpur Jajmau)'),
    date: Optional[str] = Query(None, description='Target date (YYYY-MM-DD). Defaults to today.'),
    days_window: int = Query(15, description='Search +/- N days from target date'),
    upstream_lat: Optional[float] = Query(None, description='Upstream latitude for spatial context'),
    upstream_lon: Optional[float] = Query(None, description='Upstream longitude'),
    downstream_lat: Optional[float] = Query(None, description='Downstream latitude'),
    downstream_lon: Optional[float] = Query(None, description='Downstream longitude'),
):
    """
    Query satellite water quality indices at a point.

    Returns NDTI, NDCI, Se2WaQ turbidity/Chl-a/CDOM/DOC from the
    closest cloud-free Sentinel-2 image within the date window.

    If upstream/downstream coordinates are provided, also returns
    spatial context (NDTI delta — the tampering detection signal).
    """
    target_date = date or datetime.utcnow().strftime('%Y-%m-%d')

    # Check cache
    has_spatial = bool(upstream_lat and upstream_lon and downstream_lat and downstream_lon)
    ck = cache_key(lat, lon, target_date, 'wq', spatial=has_spatial)
    if ck in _cache:
        return _cache[ck]

    point = ee.Geometry.Point([lon, lat])

    # Find best image
    image = get_best_image(point, target_date, days_window)
    if image is None:
        raise HTTPException(
            status_code=404,
            detail={
                'status': 'no_data',
                'reason': 'no_cloud_free_image',
                'message': f'No cloud-free Sentinel-2 image found within ±{days_window} days of {target_date}',
                'suggestion': 'Try a wider date window or different date',
            }
        )

    # Get metadata
    metadata = get_image_metadata(image)

    # Compute days offset from target
    acq_date = datetime.strptime(metadata['acquisition_date'][:10], '%Y-%m-%d')
    target_dt = datetime.strptime(target_date, '%Y-%m-%d')
    days_offset = abs((acq_date - target_dt).days)

    # Extract indices at the point (with cloud masking — lenient for turbid Indian rivers)
    masked = mask_clouds(image)
    indices = extract_point_values(masked, point)

    if indices is None:
        raise HTTPException(
            status_code=404,
            detail={
                'status': 'no_data',
                'reason': 'masked_pixel',
                'message': 'Point is masked (cloud, shadow, or no data) in the satellite image',
                'image_date': metadata['acquisition_date'],
            }
        )

    # Round values
    indices = {k: round(v, 4) if v is not None else None for k, v in indices.items()}

    # Build response
    response = {
        'status': 'ok',
        'location': {'lat': lat, 'lon': lon},
        'satellite': {
            **metadata,
            'days_from_target': days_offset,
            'target_date': target_date,
        },
        'indices': indices,
    }

    # Spatial context (upstream/downstream delta)
    if upstream_lat and upstream_lon and downstream_lat and downstream_lon:
        spatial = extract_spatial_context(
            image,
            discharge_point=(lon, lat),
            upstream_point=(upstream_lon, upstream_lat),
            downstream_point=(downstream_lon, downstream_lat),
        )
        # Round spatial values
        spatial = {k: round(v, 4) if v is not None else None for k, v in spatial.items()}
        response['spatial_context'] = spatial

    # Cache result (satellite data is immutable)
    _cache[ck] = response
    return response


@app.get('/facility/{facility_id}')
def facility_water_quality(
    facility_id: str,
    date: Optional[str] = Query(None, description='Target date (YYYY-MM-DD). Defaults to today.'),
    days_window: int = Query(15, description='Search +/- N days'),
):
    """
    Query satellite water quality for a pre-configured facility.

    Includes upstream/downstream spatial context automatically.
    Pre-configured facilities: KNP-TAN-001, KNP-TAN-002, VNS-TAN-001
    """
    if facility_id not in KANPUR_POINTS:
        raise HTTPException(
            status_code=404,
            detail={
                'status': 'error',
                'message': f'Facility {facility_id} not configured',
                'available': list(KANPUR_POINTS.keys()),
            }
        )

    config = KANPUR_POINTS[facility_id]
    discharge = config['discharge']
    upstream = config['upstream']
    downstream = config['downstream']

    # Delegate to main endpoint
    result = water_quality(
        lat=discharge[1],
        lon=discharge[0],
        date=date,
        days_window=days_window,
        upstream_lat=upstream[1],
        upstream_lon=upstream[0],
        downstream_lat=downstream[1],
        downstream_lon=downstream[0],
    )

    # Enrich with facility info
    result['facility'] = {
        'id': facility_id,
        'name': config['name'],
        'discharge_point': {'lat': discharge[1], 'lon': discharge[0]},
        'upstream_point': {'lat': upstream[1], 'lon': upstream[0]},
        'downstream_point': {'lat': downstream[1], 'lon': downstream[0]},
    }

    return result


@app.get('/time-series')
def time_series(
    lat: float = Query(..., description='Latitude'),
    lon: float = Query(..., description='Longitude'),
    start_date: str = Query(..., description='Start date (YYYY-MM-DD)'),
    end_date: Optional[str] = Query(None, description='End date (YYYY-MM-DD). Defaults to today.'),
    max_cloud_pct: float = Query(30.0, description='Max cloud cover percentage'),
):
    """
    NDTI time-series for a location over a date range.

    Returns one data point per cloud-free Sentinel-2 image.
    Useful for trend analysis: is the river getting cleaner or dirtier
    at this location over time?

    Aligned with UNEP SDG 6.3.2 methodology for satellite-derived
    water quality trend monitoring.
    """
    end = end_date or datetime.utcnow().strftime('%Y-%m-%d')
    point = ee.Geometry.Point([lon, lat])

    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(point)
        .filterDate(start_date, end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
        .sort('system:time_start')
    )

    count = collection.size().getInfo()
    if count == 0:
        raise HTTPException(
            status_code=404,
            detail={
                'status': 'no_data',
                'reason': 'no_images',
                'message': f'No cloud-free images found between {start_date} and {end}',
            }
        )

    # Limit to 50 images to avoid GEE timeout
    if count > 50:
        collection = collection.limit(50)
        count = 50

    image_list = collection.toList(count)
    data_points = []

    for i in range(count):
        try:
            image = ee.Image(image_list.get(i))
            masked = mask_clouds(image)

            # Extract NDTI and turbidity only (fast)
            indices = compute_indices(masked)
            values = indices.select(['ndti', 'turbidity_ntu']).reduceRegion(
                reducer=ee.Reducer.median(),
                geometry=point.buffer(100),
                scale=10,
                bestEffort=True,
            ).getInfo()

            if values.get('ndti') is None:
                continue  # Skip non-water or clouded pixels

            # Get date
            timestamp = image.get('system:time_start').getInfo()
            dt = datetime.utcfromtimestamp(timestamp / 1000)

            data_points.append({
                'date': dt.strftime('%Y-%m-%d'),
                'ndti': round(values['ndti'], 4),
                'turbidity_ntu': round(values['turbidity_ntu'], 2) if values.get('turbidity_ntu') else None,
            })
        except Exception:
            continue  # Skip problematic images

    return {
        'status': 'ok',
        'location': {'lat': lat, 'lon': lon},
        'date_range': {'start': start_date, 'end': end},
        'data_points': data_points,
        'count': len(data_points),
        'source': 'COPERNICUS/S2_SR_HARMONIZED',
        'note': 'NDTI trend aligned with UNEP SDG 6.3.2 methodology',
    }


@app.get('/validate')
def validate_against_ocems(
    facility_id: str = Query(..., description='Facility ID'),
    ocems_tss_mg_l: float = Query(..., description='OCEMS TSS reading (mg/L)'),
    date: Optional[str] = Query(None, description='Date of OCEMS reading (YYYY-MM-DD)'),
):
    """
    Cross-validate an OCEMS TSS reading against satellite turbidity.

    This is the core anti-tampering check:
    - If OCEMS says TSS is low but satellite shows high turbidity → anomaly
    - If OCEMS says TSS is high and satellite confirms → consistent
    - If no satellite data available → returns no_coverage

    The result goes on-chain via HCS as part of the trust chain evidence.
    """
    if facility_id not in KANPUR_POINTS:
        raise HTTPException(status_code=404, detail=f'Facility {facility_id} not configured')

    target_date = date or datetime.utcnow().strftime('%Y-%m-%d')

    try:
        sat_data = facility_water_quality(facility_id, target_date)
    except HTTPException:
        return {
            'status': 'no_coverage',
            'facility_id': facility_id,
            'ocems_tss_mg_l': ocems_tss_mg_l,
            'satellite_validated': False,
            'reason': 'No cloud-free satellite image available for this date window',
            'date': target_date,
        }

    ndti = sat_data.get('indices', {}).get('ndti')
    turbidity = sat_data.get('indices', {}).get('turbidity_ntu')
    delta_ndti = sat_data.get('spatial_context', {}).get('delta_ndti')

    # Simple anomaly detection logic:
    # TSS and NDTI should correlate positively
    # Low TSS + High NDTI = potential data falsification
    # High TSS + Low NDTI = potential sensor malfunction
    anomaly_flag = False
    anomaly_reason = None
    confidence = 'low'

    if ndti is not None:
        # Empirical thresholds (conservative)
        if ocems_tss_mg_l < 50 and ndti > 0.15:
            anomaly_flag = True
            anomaly_reason = 'OCEMS reports low TSS but satellite shows elevated turbidity'
            confidence = 'high'
        elif ocems_tss_mg_l > 100 and ndti < 0.05:
            anomaly_flag = True
            anomaly_reason = 'OCEMS reports high TSS but satellite shows low turbidity'
            confidence = 'moderate'
        elif ocems_tss_mg_l < 100 and ndti < 0.15:
            confidence = 'high'  # Consistent: both low
        else:
            confidence = 'moderate'  # Both elevated, consistent

    # Spatial anomaly: significant upstream/downstream delta suggests real pollution
    spatial_anomaly = False
    if delta_ndti is not None and delta_ndti > 0.08:
        spatial_anomaly = True

    return {
        'status': 'validated',
        'facility_id': facility_id,
        'ocems_tss_mg_l': ocems_tss_mg_l,
        'satellite': {
            'ndti': ndti,
            'turbidity_ntu': turbidity,
            'image_date': sat_data.get('satellite', {}).get('acquisition_date'),
            'days_offset': sat_data.get('satellite', {}).get('days_from_target'),
        },
        'spatial_context': sat_data.get('spatial_context'),
        'validation': {
            'satellite_validated': True,
            'anomaly_flag': anomaly_flag,
            'anomaly_reason': anomaly_reason,
            'spatial_anomaly': spatial_anomaly,
            'correlation_confidence': confidence,
        },
        'note': 'TSS↔NDTI correlation based on published Ganga studies (R²=0.70-0.93)',
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
