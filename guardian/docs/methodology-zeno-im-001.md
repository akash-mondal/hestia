# Zeno IM-001: Industrial Effluent Compliance dMRV

## Methodology Overview

| Field | Value |
|-------|-------|
| **ID** | Zeno IM-001 |
| **Title** | Industrial Effluent Compliance Digital MRV |
| **Version** | 1.0.0 |
| **Applicability** | Industrial effluent discharge into freshwater systems |
| **Initial Scope** | India's 4,433 Grossly Polluting Industries (GPIs) on Ganga tributaries |
| **Regulatory Basis** | CPCB Schedule-VI (General Standards for Discharge of Environmental Pollutants) |
| **Platform** | Hedera Guardian + HTS + HCS |
| **Token Model** | GGCC (fungible compliance credit) + ZVIOL (non-fungible violation record) |

## Monitored Parameters

### Primary: OCEMS Sensor Data

| # | Parameter | Unit | Schedule-VI Limit | Critical Threshold |
|---|-----------|------|-------------------|-------------------|
| 1 | pH | - | 5.5 – 9.0 | < 4.0 or > 10.0 |
| 2 | BOD | mg/L | ≤ 30 | > 45 |
| 3 | COD | mg/L | ≤ 250 | > 375 |
| 4 | TSS | mg/L | ≤ 100 | > 150 |
| 5 | Temperature | °C | ≤ 40 | > 45 |
| 6 | Total Chromium | mg/L | ≤ 2.0 | > 3.0 |
| 7 | Hexavalent Chromium | mg/L | ≤ 0.1 | > 0.2 |
| 8 | Oil & Grease | mg/L | ≤ 10 | > 20 |
| 9 | Ammoniacal Nitrogen | mg/L | ≤ 50 | > 75 |

### Secondary: Satellite Cross-Validation (Sentinel-2 Se2WaQ)

| Index | Description | Purpose |
|-------|------------|---------|
| NDTI | Normalized Difference Turbidity Index | Correlates with TSS |
| NDCI | Normalized Difference Chlorophyll Index | Indicates organic pollution |
| Turbidity (NTU) | Se2WaQ turbidity estimate | Independent TSS check |
| Chlorophyll-a (mg/m³) | Se2WaQ chlorophyll estimate | Independent BOD proxy |

## Compliance Evaluation Logic

```
For each SensorReading:
  1. Check each parameter against Schedule-VI limit
  2. Count violations (parameters exceeding limit)
  3. Count critical violations (parameters exceeding critical threshold)
  4. Determine token action:
     - 0 violations → mint_ggcc (mint 1 GGCC compliance credit)
     - ≥1 critical violation → mint_violation_nft (mint 1 ZVIOL record)
     - violations but no critical → pending_review (queue for VVB)
```

## Token Model

### GGCC (Ganga Compliance Credit)
- **Type**: Fungible (HTS)
- **Mint rule**: 1 token per compliant evaluation period
- **Meaning**: Facility demonstrated all parameters within Schedule-VI limits
- **Tradability**: Transferable between accounts (compliance credit market)

### ZVIOL (Zeno Violation Record)
- **Type**: Non-fungible (HTS NFT)
- **Mint rule**: 1 NFT per critical violation event
- **Meaning**: Immutable record of regulatory breach with full provenance
- **Tradability**: Non-transferable (regulatory record)

## Verifiable Credential Schemas

| Schema | Purpose | Fields |
|--------|---------|--------|
| FacilityRegistration | SPCB-approved facility identity | 16 fields: ID, name, industry, GPS, OCEMS device, CTO details, KMS key |
| SensorReading | KMS-signed OCEMS data | 16 fields: timestamp, facility, 9 parameters, sensor status, KMS signature |
| ComplianceEvaluation | CPCB Schedule-VI check result | 21 fields: facility, per-parameter compliance flags, overall result, token action |
| SatelliteValidation | Sentinel-2 cross-validation | 7 fields: facility, NDTI, NDCI, turbidity, chlorophyll, correlation score |

## Data Provenance

Each sensor reading is signed with an AWS KMS HSM key (ECC_SECG_P256K1):
1. OCEMS device generates reading
2. Reading payload hashed with keccak256
3. Hash signed by AWS KMS (ECDSA secp256k1, MessageType: DIGEST)
4. Signature + public key stored in SensorReading VC
5. VC submitted to Guardian → saved to Hedera HCS topic
6. Anyone can verify: `keccak256(payload)` + `publicKey` + `signature` → verify locally (no KMS call needed)

## Fork Guide

To adapt Zeno IM-001 for a different jurisdiction:

1. **Swap thresholds**: Replace CPCB Schedule-VI limits with:
   - EU Industrial Emissions Directive (IED) BAT-AELs
   - US EPA NPDES permit limits
   - Any national/regional discharge standard
2. **Adjust parameters**: Add or remove monitored parameters
3. **Update schemas**: Modify Guardian schemas for new field mappings
4. **Reconfigure satellite**: Adjust Se2WaQ indices for local water body characteristics
5. **Deploy**: Same Guardian policy structure, same Hedera token model

The methodology is designed to be forkable — the framework is universal, only the thresholds and parameter set change.
