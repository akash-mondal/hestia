# Satellite API

Python FastAPI service for remote sensing data — vegetation indices (Sentinel-2) and active fire detection (NASA FIRMS).

## Endpoints

| Endpoint | Source | Data |
|----------|--------|------|
| `/vegetation` | Sentinel-2 L2A via GEE | NDVI, NBR, dNBR, burn severity |
| `/active-fires` | NASA FIRMS VIIRS | Lat, lon, brightness, FRP, confidence |

## Running

```bash
cd packages/satellite
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --port 8001
```

Requires Google Earth Engine service account (`gee-service-account.json`) for Sentinel-2 access.
