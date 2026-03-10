# @zeno/satellite — Sentinel-2 Water Quality Cross-Validation

Independent satellite-derived water quality verification for OCEMS sensor readings. The third pillar of Zeno's integrity model: **OCEMS** (ground truth) + **Blockchain** (tamper resistance) + **Satellite** (independent corroboration).

---

## Why Satellite Cross-Validation?

OCEMS sensors are operated by the industries they monitor — creating a fundamental conflict of interest. Nine documented tampering methods exist (sample dilution, bypass piping, calibration drift, etc.). Satellite imagery provides an **unfalsifiable external reference** that no facility operator can manipulate.

**What satellites CAN detect**: TSS/turbidity (via NDTI), chlorophyll-a (indirect BOD proxy), colored dissolved organic matter (CDOM), dissolved organic carbon (DOC).

**What satellites CANNOT detect**: pH, dissolved oxygen, heavy metals (Cr), BOD, COD directly. Satellite is for **anomaly detection**, not absolute measurement.

**Key insight**: The upstream-to-downstream NDTI delta is the primary tampering signal. If NDTI increases significantly across a discharge zone, that facility is contributing pollution — regardless of what OCEMS reports.

---

## Architecture

```
Sentinel-2 (ESA)         OCEMS Sensor
    │                        │
    ▼                        ▼
Google Earth Engine      Hedera HCS
    │                        │
    ▼                        ▼
┌─────────────────────────────────────┐
│  Satellite API (FastAPI)            │
│                                     │
│  /water-quality  — Point indices    │
│  /facility/{id}  — Spatial context  │
│  /time-series    — NDTI trends      │
│  /validate       — Cross-validation │
└─────────────────────────────────────┘
    │                        │
    ▼                        ▼
Dashboard (overlay)    HCS (on-chain evidence)
```

---

## Water Quality Indices

All indices computed from Sentinel-2 SR (Surface Reflectance) bands.

### Primary: NDTI (Normalized Difference Turbidity Index)

```
NDTI = (B4 − B3) / (B4 + B3)
```

- **Resolution**: 10m (both bands native)
- **Correlation with TSS**: R² = 0.70–0.93 in published Ganga studies
- **Use**: Primary cross-validation index against OCEMS TSS readings

### Secondary: NDCI (Normalized Difference Chlorophyll Index)

```
NDCI = (B5 − B4) / (B5 + B4)
```

- **Resolution**: 20m effective (B5 is 20m, resampled by GEE)
- **Use**: Indirect BOD proxy via chlorophyll-a correlation

### Se2WaQ Formulas (Potes et al. 2018)

| Parameter | Formula | Unit | Source |
|-----------|---------|------|--------|
| Turbidity | `8.93 × (B03/B01) − 6.39` | NTU | Potes et al. 2018 |
| Chlorophyll-a | `4.26 × (B03/B01)^3.94` | mg/m³ | Potes et al. 2018 |
| CDOM | `537 × exp(−2.93 × B03/B04)` | mg/L | Toming et al. 2016 |
| DOC | `432 × exp(−2.24 × B03/B04)` | mg/L | Toming et al. 2016 |

### Documented Limitations

- Se2WaQ formulas calibrated on European reservoirs/lakes, not Indian rivers
- Turbidity formula saturates above ~30 NTU (Ganga can exceed 1000 NTU in monsoon)
- B01 (aerosol band) is 60m resolution — limits Se2WaQ spatial precision
- CDOM/DOC formulas calibrated on L1C imagery, accuracy reduced with L2A (SR)
- Sentinel-2 revisits every ~5 days — not real-time monitoring

---

## Spatial Analysis (Novel Contribution)

The upstream/downstream NDTI delta is the key tampering detection signal:

```
Upstream Point (~1km before facility)
        │
        ▼ river flow direction
Discharge Point (at facility outfall)
        │
        ▼
Downstream Point (~500m after facility)

If NDTI_downstream > NDTI_upstream → facility is contributing pollution
```

This works regardless of OCEMS readings. A facility can report TSS = 30 mg/L (compliant), but if satellite shows NDTI jumping from 0.04 upstream to 0.15 downstream, the evidence speaks for itself.

---

## API Endpoints

### `GET /health`
GEE connectivity check.

### `GET /water-quality`
Point query with optional spatial context.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `lat` | Yes | Latitude |
| `lon` | Yes | Longitude |
| `date` | No | Target date (YYYY-MM-DD), defaults to today |
| `days_window` | No | Search ±N days (default: 15) |
| `upstream_lat/lon` | No | Upstream point for spatial context |
| `downstream_lat/lon` | No | Downstream point for spatial context |

### `GET /facility/{facility_id}`
Pre-configured facility with automatic spatial analysis. Includes upstream/downstream NDTI delta.

Available facilities: `KNP-TAN-001` (Jajmau Tannery Cluster), `KNP-TAN-002` (Super Tannery Works)

### `GET /time-series`
Historical NDTI trend for a location. Aligned with UNEP SDG 6.3.2 methodology.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `lat` | Yes | Latitude |
| `lon` | Yes | Longitude |
| `start_date` | Yes | Start date |
| `end_date` | No | End date (defaults to today) |
| `max_cloud_pct` | No | Max cloud cover % (default: 30) |

### `GET /validate`
Cross-validate an OCEMS TSS reading against satellite NDTI.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `facility_id` | Yes | Pre-configured facility ID |
| `ocems_tss_mg_l` | Yes | OCEMS TSS reading (mg/L) |
| `date` | No | Date of OCEMS reading |

**Anomaly detection logic**:
- Low TSS + High NDTI → potential data falsification (high confidence)
- High TSS + Low NDTI → potential sensor malfunction (moderate confidence)
- Both low or both high → consistent reading

---

## SCL Classification Issue (Indian Rivers)

Sentinel-2's Scene Classification Layer (SCL) frequently misclassifies turbid Indian river pixels as **SCL=5 (Bare Soil)** instead of **SCL=6 (Water)**. This is because the high sediment load in Ganga tributaries makes the spectral signature resemble bare earth.

**Solution**: `mask_clouds()` uses a lenient mask that only removes definite clouds and shadows (SCL 0,1,2,3,8,9,10,11), keeping bare soil pixels where river data actually resides. The strict `mask_clouds_and_non_water()` (SCL=6 only) is available but should NOT be used for Indian rivers.

---

## Pre-Configured Coordinates

```python
JAJMAU_DISCHARGE = (80.40, 26.40)        # Jajmau tannery cluster discharge zone
JAJMAU_UPSTREAM  = (80.385, 26.41)       # ~1km upstream on Ganga
JAJMAU_DOWNSTREAM = (80.403, 26.395)     # ~500m downstream
```

---

## Setup

### Prerequisites

1. Google Cloud Project with Earth Engine API enabled
2. Service account with **Earth Engine Resource Viewer** role
3. Service account JSON key file

### Install

```bash
cd packages/satellite
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment

```bash
# In repo root .env
GEE_SERVICE_ACCOUNT_KEY_PATH=./gee-service-account.json
GEE_PROJECT_ID=your-project-id
```

### Run

```bash
cd packages/satellite
source .venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 8000
```

### Test

```bash
# Health check
curl http://localhost:8000/health

# Point query at Kanpur Jajmau
curl "http://localhost:8000/water-quality?lat=26.40&lon=80.40&date=2026-01-15"

# Facility with spatial context
curl "http://localhost:8000/facility/KNP-TAN-001?date=2026-01-15"

# NDTI time-series (Jan-Mar 2026)
curl "http://localhost:8000/time-series?lat=26.40&lon=80.40&start_date=2026-01-01&end_date=2026-03-01"

# Cross-validate OCEMS reading
curl "http://localhost:8000/validate?facility_id=KNP-TAN-001&ocems_tss_mg_l=45&date=2026-01-15"
```

---

## Integration with Hedera

Satellite validation results are submitted to HCS as part of the trust chain:

1. Compliance engine detects potential violation from OCEMS data
2. Satellite API is queried for the facility's discharge point
3. Validation result (NDTI, turbidity, correlation confidence) goes on-chain via HCS
4. Trust chain evidence package links: OCEMS reading → KMS signature → satellite validation → compliance evaluation → token

This creates an independent, unfalsifiable layer of evidence that strengthens the entire compliance verification pipeline.

---

## References

- Potes et al. 2018 (PIAHS): Se2WaQ formulas from Alqueva Reservoir
- Toming et al. 2016 (Remote Sensing): Estonian lake CDOM/DOC
- Mishra & Mishra 2012: NDCI original paper
- Ganga COVID lockdown study (2020): NDTI validation at Kanpur
- Ganga Varanasi ML study (2024): R² = 0.91–0.93 for turbidity
- UNEP SDG 6.3.2: Satellite-derived water quality trend methodology

## File Reference

| File | Purpose |
|------|---------|
| `water_quality.py` | Core GEE module — index computation, cloud masking, spatial analysis |
| `api.py` | FastAPI server — 5 endpoints for dashboard and cross-validation |
| `requirements.txt` | Python dependencies |
