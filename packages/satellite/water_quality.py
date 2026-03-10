"""
Sentinel-2 Water Quality Index Computation for Project Zeno

Computes satellite-derived water quality indices from Sentinel-2 SR imagery
for cross-validation of OCEMS sensor readings at industrial discharge points.

Primary validation: TSS ↔ NDTI/Turbidity (R² = 0.70-0.93 in published Ganga studies)
Secondary indicators: Chl-a (indirect BOD proxy), CDOM (weak COD proxy)

Formulas:
  - NDTI: (B4−B3)/(B4+B3) — 10m resolution, both bands native
  - NDCI: (B5−B4)/(B5+B4) — 20m effective (B5 is 20m)
  - Se2WaQ Turbidity: 8.93 × (B03/B01) − 6.39 (Potes et al. 2018)
  - Se2WaQ Chl-a: 4.26 × (B03/B01)^3.94 (Potes et al. 2018)
  - Se2WaQ CDOM: 537 × exp(−2.93 × B03/B04) (Toming et al. 2016, L1C-calibrated)
  - Se2WaQ DOC: 432 × exp(−2.24 × B03/B04) (Toming et al. 2016, L1C-calibrated)

Limitations (documented for transparency):
  - Se2WaQ formulas calibrated on European reservoirs/lakes, not Indian rivers
  - Turbidity formula saturates above ~30 NTU (Ganga can exceed 1000 NTU in monsoon)
  - Cannot detect: pH, dissolved oxygen, heavy metals (Cr), BOD, COD directly
  - B01 (aerosol) is 60m resolution — limits Se2WaQ spatial precision
  - CDOM/DOC formulas calibrated on L1C, accuracy reduced with L2A
  - Satellite provides ANOMALY DETECTION, not absolute measurement

References:
  - Potes et al. 2018 (PIAHS): Se2WaQ formulas from Alqueva Reservoir
  - Toming et al. 2016 (Remote Sensing): Estonian lake CDOM/DOC
  - Mishra & Mishra 2012: NDCI original paper
  - Ganga COVID lockdown study (2020): NDTI validation at Kanpur
  - Ganga Varanasi ML study (2024): R² = 0.91-0.93 for turbidity
"""

import ee
import math
from typing import Optional

# Scale factor: S2 SR bands are UINT16 × 10000
SCALE_FACTOR = 0.0001

# SCL classes to keep (water only)
SCL_WATER = 6

# SCL classes to mask
SCL_MASK_CLASSES = [0, 1, 2, 3, 7, 8, 9, 10, 11]  # no data, defective, shadows, clouds, snow


def mask_clouds(image: ee.Image) -> ee.Image:
    """
    Mask cloud and shadow pixels using Scene Classification Layer.

    Keeps water (6), vegetation (4), bare soil (5), and unclassified (7)
    because SCL frequently misclassifies turbid river pixels as non-water
    in Indian rivers. We mask only definite clouds and shadows.
    """
    scl = image.select('SCL')
    # Mask: no data (0), saturated (1), shadows (2,3), cloud med (8), cloud high (9), cirrus (10), snow (11)
    cloud_shadow_mask = (
        scl.neq(0).And(scl.neq(1))
        .And(scl.neq(2)).And(scl.neq(3))
        .And(scl.neq(8)).And(scl.neq(9))
        .And(scl.neq(10)).And(scl.neq(11))
    )
    return image.updateMask(cloud_shadow_mask)


def mask_clouds_and_non_water(image: ee.Image) -> ee.Image:
    """
    Strict mask: only water pixels (SCL class 6).
    Use mask_clouds() instead for turbid Indian rivers where SCL
    frequently misclassifies water as bare soil or unclassified.
    """
    scl = image.select('SCL')
    water_mask = scl.eq(SCL_WATER)
    return image.updateMask(water_mask)


def compute_indices(image: ee.Image) -> ee.Image:
    """
    Compute all water quality indices from a single Sentinel-2 SR image.

    Returns an image with bands:
      ndti, ndci, turbidity_ntu, chl_a_mg_m3, cdom_mg_l, doc_mg_l
    """
    # Scale reflectance values
    b01 = image.select('B1').multiply(SCALE_FACTOR)
    b02 = image.select('B2').multiply(SCALE_FACTOR)
    b03 = image.select('B3').multiply(SCALE_FACTOR)
    b04 = image.select('B4').multiply(SCALE_FACTOR)
    b05 = image.select('B5').multiply(SCALE_FACTOR)

    # NDTI — Normalized Difference Turbidity Index (10m, both bands native)
    # Primary TSS cross-validation index
    ndti = b04.subtract(b03).divide(b04.add(b03)).rename('ndti')

    # NDCI — Normalized Difference Chlorophyll Index (20m effective)
    # Mishra & Mishra 2012, R² = 0.72 for Chl-a
    ndci = b05.subtract(b04).divide(b05.add(b04)).rename('ndci')

    # Se2WaQ Turbidity (NTU) — Potes et al. 2018
    # 8.93 × (B03/B01) − 6.39
    # Note: B01 is 60m resolution, GEE resamples to match
    ratio_b03_b01 = b03.divide(b01)
    turbidity = ratio_b03_b01.multiply(8.93).subtract(6.39).rename('turbidity_ntu')

    # Se2WaQ Chlorophyll-a (mg/m³) — Potes et al. 2018
    # 4.26 × (B03/B01)^3.94
    chl_a = ratio_b03_b01.pow(3.94).multiply(4.26).rename('chl_a_mg_m3')

    # Se2WaQ CDOM (mg/L) — Toming et al. 2016 (calibrated on L1C, R² = 0.72)
    # 537 × exp(−2.93 × B03/B04)
    ratio_b03_b04 = b03.divide(b04)
    cdom = ratio_b03_b04.multiply(-2.93).exp().multiply(537).rename('cdom_mg_l')

    # Se2WaQ DOC (mg/L) — Toming et al. 2016 (calibrated on L1C, R² = 0.92)
    # 432 × exp(−2.24 × B03/B04)
    doc = ratio_b03_b04.multiply(-2.24).exp().multiply(432).rename('doc_mg_l')

    return ee.Image.cat([ndti, ndci, turbidity, chl_a, cdom, doc])


def extract_point_values(
    image: ee.Image,
    point: ee.Geometry.Point,
    scale: int = 10,
) -> Optional[dict]:
    """
    Extract water quality index values at a specific point.

    Returns dict with index values, or None if pixel is masked (cloud/non-water).
    """
    indices = compute_indices(image)

    result = indices.reduceRegion(
        reducer=ee.Reducer.median(),
        geometry=point,
        scale=scale,
        bestEffort=True,
    ).getInfo()

    # Check if all values are None (masked pixel)
    if all(v is None for v in result.values()):
        return None

    return result


def extract_spatial_context(
    image: ee.Image,
    discharge_point: tuple[float, float],
    upstream_point: tuple[float, float],
    downstream_point: tuple[float, float],
    scale: int = 10,
) -> dict:
    """
    Extract NDTI at upstream, discharge, and downstream points for spatial analysis.

    The upstream/downstream delta is the key tampering detection signal:
    if NDTI jumps significantly from upstream to downstream, the industrial
    zone between them is contributing pollution — regardless of what OCEMS says.

    Returns:
        {
            "upstream_ndti": float or None,
            "discharge_ndti": float or None,
            "downstream_ndti": float or None,
            "delta_ndti": float or None (downstream - upstream),
            "upstream_turbidity_ntu": float or None,
            "downstream_turbidity_ntu": float or None,
        }
    """
    indices = compute_indices(mask_clouds(image))

    points = {
        'upstream': ee.Geometry.Point(upstream_point),
        'discharge': ee.Geometry.Point(discharge_point),
        'downstream': ee.Geometry.Point(downstream_point),
    }

    results = {}
    for name, geom in points.items():
        values = indices.reduceRegion(
            reducer=ee.Reducer.median(),
            geometry=geom.buffer(100),  # 100m buffer for water pixel capture
            scale=scale,
            bestEffort=True,
        ).getInfo()
        results[name] = values

    upstream_ndti = results['upstream'].get('ndti')
    downstream_ndti = results['downstream'].get('ndti')

    delta_ndti = None
    if upstream_ndti is not None and downstream_ndti is not None:
        delta_ndti = round(downstream_ndti - upstream_ndti, 6)

    return {
        'upstream_ndti': upstream_ndti,
        'discharge_ndti': results['discharge'].get('ndti'),
        'downstream_ndti': downstream_ndti,
        'delta_ndti': delta_ndti,
        'upstream_turbidity_ntu': results['upstream'].get('turbidity_ntu'),
        'downstream_turbidity_ntu': results['downstream'].get('turbidity_ntu'),
    }


def get_best_image(
    point: ee.Geometry.Point,
    target_date: str,
    days_window: int = 15,
    max_cloud_pct: float = 30.0,
) -> Optional[ee.Image]:
    """
    Find the best (least cloudy, closest in time) Sentinel-2 image
    within a date window around the target date.

    Args:
        point: Geographic point to query
        target_date: ISO date string (YYYY-MM-DD)
        days_window: Search +/- this many days from target
        max_cloud_pct: Maximum scene cloud cover percentage

    Returns:
        Best ee.Image or None if no cloud-free image found
    """
    from datetime import datetime, timedelta

    dt = datetime.strptime(target_date, '%Y-%m-%d')
    start = (dt - timedelta(days=days_window)).strftime('%Y-%m-%d')
    end = (dt + timedelta(days=days_window)).strftime('%Y-%m-%d')

    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(point)
        .filterDate(start, end)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_pct))
        .sort('CLOUDY_PIXEL_PERCENTAGE')
    )

    count = collection.size().getInfo()
    if count == 0:
        return None

    return collection.first()


def get_image_metadata(image: ee.Image) -> dict:
    """Extract metadata from a Sentinel-2 image."""
    info = image.getInfo()
    props = info.get('properties', {})

    # Convert GENERATION_TIME from milliseconds to ISO string
    gen_time = props.get('GENERATION_TIME', 0)
    if isinstance(gen_time, (int, float)):
        from datetime import datetime
        acquisition_date = datetime.utcfromtimestamp(gen_time / 1000).strftime('%Y-%m-%dT%H:%M:%SZ')
    else:
        acquisition_date = str(gen_time)

    return {
        'source': 'COPERNICUS/S2_SR_HARMONIZED',
        'image_id': info.get('id', 'unknown'),
        'acquisition_date': acquisition_date,
        'cloud_cover_pct': round(props.get('CLOUDY_PIXEL_PERCENTAGE', -1), 2),
        'spacecraft': props.get('SPACECRAFT_NAME', 'unknown'),
        'mgrs_tile': props.get('MGRS_TILE', 'unknown'),
    }


# ─── Kanpur Jajmau Cluster Coordinates ───────────────────────────────
# Pre-configured sample points for the primary demo area

JAJMAU_DISCHARGE = (80.40, 26.40)        # Jajmau tannery cluster discharge zone
JAJMAU_UPSTREAM = (80.385, 26.41)        # ~1km upstream of Jajmau on Ganga
JAJMAU_DOWNSTREAM = (80.403, 26.395)     # ~500m downstream of Jajmau

# Additional demo facilities along Ganga
KANPUR_POINTS = {
    'KNP-TAN-001': {
        'name': 'Jajmau Tannery Cluster',
        'discharge': JAJMAU_DISCHARGE,
        'upstream': JAJMAU_UPSTREAM,
        'downstream': JAJMAU_DOWNSTREAM,
    },
    'KNP-TAN-002': {
        'name': 'Super Tannery Works',
        'discharge': (80.395, 26.405),
        'upstream': JAJMAU_UPSTREAM,
        'downstream': JAJMAU_DOWNSTREAM,
    },
}
