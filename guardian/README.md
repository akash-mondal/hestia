# Guardian dMRV Policy Engine

Zeno's Guardian component provides the governance and orchestration layer for industrial effluent compliance verification. It manages the full digital MRV (Measurement, Reporting, Verification) lifecycle using Hedera Guardian's policy engine.

## Architecture

Guardian sits as a **parallel governance layer** alongside Zeno's existing blockchain pipeline:

```
EXISTING PIPELINE (packages/blockchain/):
  Generator → KMS Sign → Validator → HCS → Mirror Node → Compliance Engine → HTS Mint

GUARDIAN (this directory):
  Governance: roles, approvals, VC creation, trust chains, audit trail
  Connected via REST API middleware

They run in parallel — Guardian does NOT replace the pipeline.
Guardian adds: W3C Verifiable Credentials, role-based workflow, auditable trust chain.
```

## Guardian Instance

| Property | Value |
|----------|-------|
| Hedera Account | 0.0.7231410 (ED25519) |
| DID | did:hedera:testnet:4VgrsrHeV4tegS3M7B5N17v795zUEdeHexYtWA8E94Jr_0.0.8155225 |
| Standard Registry | Central Pollution Control Board (CPCB) |
| Network | Hedera Testnet |

## Tokens (Created on Hedera Testnet)

| Token | ID | Type | Symbol | Purpose |
|-------|-----|------|--------|---------|
| Green Ganga Compliance Credit | 0.0.8163838 | Fungible | GGCC | 1 token = 1 compliant evaluation period |
| Violation Record | 0.0.8163841 | NFT | ZVIOL | Immutable violation record with evidence |
| Compliance Certificate | 0.0.8163843 | NFT | ZCERT | 90-day sustained compliance certificate |

## Schemas

4 VC schemas define the data model. JSON source files in `schemas/` use Guardian's JSON Schema Draft 7 format.

| Schema | Entity | Fields | Purpose |
|--------|--------|--------|---------|
| [FacilityRegistration](schemas/FacilityRegistration.json) | VC | 17 | Industrial facility identity, CTO details, OCEMS device info, KMS key binding |
| [SensorReading](schemas/SensorReading.json) | VC | 16 | OCEMS sensor data with CPCB Schedule-VI parameters, KMS signature |
| [ComplianceEvaluation](schemas/ComplianceEvaluation.json) | VC | 21 | Per-parameter compliance results, violation counts, token action |
| [SatelliteValidation](schemas/SatelliteValidation.json) | VC | 7 | Sentinel-2 Se2WaQ water quality indices for cross-validation |

### Schema Field Summary

**FacilityRegistration** — Facility identity + Consent to Operate
- facilityId, facilityName, industryCategory (18 CPCB categories)
- state, district, gpsLatitude, gpsLongitude
- ocemsSensorModel, analyzerSerialNumber
- ctoNumber, ctoValidUntil, ctoDischargeMode (discharge/ZLD)
- ctoBODLimit, ctoCODLimit, ctoTSSLimit (optional CTO overrides)
- deviceKmsKeyId, deviceHederaAccountId

**SensorReading** — MRV data from OCEMS devices
- timestamp, facilityId
- pH, BOD_mgL, COD_mgL, TSS_mgL, temperature_C, totalChromium_mgL
- hexChromium_mgL, oilAndGrease_mgL, ammoniacalN_mgL, dissolvedOxygen_mgL (optional)
- flow_KLD, sensorStatus
- kmsKeyId, kmsSigHash (cryptographic proof)

**ComplianceEvaluation** — Output of compliance check
- evaluationId, facilityId, evaluatedAt, limitsSource, isZLD
- Per-parameter: pH/BOD/COD/TSS/temp/chromium _compliant + _value
- overallCompliant, violationCount, criticalViolationCount, tokenAction

**SatelliteValidation** — Independent satellite cross-check
- facilityId, sentinelTileDate
- NDTI_value, NDCI_value, turbidity_NTU, chlorophyll_mgm3
- correlationScore (OCEMS vs satellite agreement)

## Policy Design (65 Blocks)

The complete policy is built programmatically via `scripts/build-policy.py` and exported to `policies/zeno-dmrv-v1.policy.json`. The policy tree has 65 blocks across 5 role workflows.

### Roles
1. **Standard Registry (CPCB)** — Publishes methodology, overall governance, trust chain view
2. **Facility** — Industrial plant operator, submits registration, views compliance dashboard
3. **SPCB** — State Pollution Control Board inspector, approves registrations, monitors violations
4. **VVB** — Verification/Validation Body auditor, reviews flagged violations, satellite data
5. **IoT** — Automated sensor data service (externalDataBlock ingestion)

### Workflow Stages

```
Stage 1 — Registration:
  Facility submits FacilityRegistration VC
  → sendToGuardianBlock (Hedera + DB, status: "Waiting for approval")
  → informationBlock (wait screen)
  → SPCB sees in registrations grid → Approve/Reject buttons
  → On approve: reassigningBlock (re-sign by CPCB) → save approved copy

Stage 2 — Sensor Ingestion:
  IoT role → externalDataBlock (REST API intake, SensorReading schema)
  → documentValidatorBlock (schema + KMS signature check)
  → customLogicBlock (CPCB Schedule-VI compliance JavaScript)
  → sendToGuardianBlock (save evaluation to Hedera + DB)
  → switchBlock (route by tokenAction field)

Stage 3a — Compliant Path:
  tokenAction == "mint_ggcc"
  → save with status "Compliant"
  → mintDocumentBlock (GGCC fungible token)

Stage 3b — Violation Path:
  tokenAction == "mint_violation_nft"
  → save with status "Violation"
  → mintDocumentBlock (ZVIOL NFT)

Stage 3c — Pending Review Path:
  tokenAction == "pending_review"
  → save with status "Pending Review"
  → VVB reviews in flagged violations grid

Stage 4 — Trust Chain:
  reportBlock with 5 reportItemBlocks
  → Token Mint → Evaluation → Sensor Reading → Facility (Approved) → Facility (Submitted)
```

### Compliance Check Logic (customLogicBlock JavaScript)

The `customLogicBlock` runs CPCB Schedule-VI threshold checks:

| Parameter | Limit | Critical Threshold |
|-----------|-------|--------------------|
| pH | 5.5–9.0 (range) | — |
| BOD | ≤ 30 mg/L | > 45 mg/L |
| COD | ≤ 250 mg/L | > 375 mg/L |
| TSS | ≤ 100 mg/L | > 150 mg/L |
| Temperature | ≤ 40°C | — |
| Total Chromium | ≤ 2.0 mg/L | > 3.0 mg/L |

Output `tokenAction`: `mint_ggcc` (all compliant), `mint_violation_nft` (critical violations), `pending_review` (minor violations, needs VVB review).

### Key Policy Blocks Used

| Block Type | Tag | Purpose |
|------------|-----|---------|
| `policyRolesBlock` | choose_role | Role selection (Facility/SPCB/VVB/IoT) |
| `requestVcDocumentBlock` | facility_registration_form | FacilityRegistration form |
| `externalDataBlock` | sensor_data_intake | REST API sensor data ingestion |
| `documentValidatorBlock` | validate_reading | Schema + signature validation |
| `customLogicBlock` | compliance_check | CPCB Schedule-VI JS evaluation |
| `switchBlock` | compliance_router | Route by compliance result |
| `mintDocumentBlock` | mint_ggcc / mint_violation_nft | Token minting |
| `sendToGuardianBlock` | (multiple) | Save to Hedera HCS + internal DB |
| `reassigningBlock` | sign_by_cpcb | Re-sign approved registration by SR |
| `interfaceDocumentsSourceBlock` | (grids) | Data display tables for each role |
| `documentsSourceAddon` | (sources) | Data source with filters for grids |
| `buttonBlock` | approve_registration_btn | Approve/Reject buttons for SPCB |
| `reportBlock` + `reportItemBlock` | trustChainBlock | Trust chain drill-down |
| `informationBlock` | wait_for_approval | Status messages |

## Directory Structure

```
guardian/
├── README.md                        # This file
├── GUARDIAN-BUILD-PLAN.md           # Detailed 8-phase implementation plan
├── schemas/
│   ├── FacilityRegistration.json    # 17 fields, facility identity + CTO
│   ├── SensorReading.json           # 16 fields, OCEMS MRV data
│   ├── ComplianceEvaluation.json    # 21 fields, compliance results
│   └── SatelliteValidation.json     # 7 fields, satellite cross-check
├── policies/
│   └── zeno-dmrv-v1.policy.json     # Full 65-block policy export (auto-generated)
└── scripts/
    ├── build-policy.py              # Builds complete policy block tree + pushes via API
    └── dry-run-test.py              # Dry-run testing: virtual users, role assignment, data flow
```

## Scripts

### build-policy.py

Programmatically constructs the complete 65-block policy tree and pushes it to a Guardian instance via REST API. Contains:
- All block definitions with proper nesting, permissions, and events
- CPCB Schedule-VI compliance check JavaScript (customLogicBlock)
- Token references (GGCC, ZVIOL, ZCERT)
- Schema IRI references for all 4 VC types

```bash
python3 scripts/build-policy.py --dry-run   # Preview block tree
python3 scripts/build-policy.py --push      # Push to Guardian API
```

### dry-run-test.py

Tests the full policy workflow in Guardian's dry-run mode (virtual users, no HBAR spent):
1. Start dry-run mode
2. Create virtual users
3. Assign roles (Facility, SPCB, IoT)
4. Submit facility registration
5. SPCB approval flow
6. Sensor data submission
7. Compliance check verification

```bash
python3 scripts/dry-run-test.py
```

## Guardian API Patterns

### Authentication
```
POST /accounts/login        → { refreshToken }
POST /accounts/access-token → { accessToken }
```

### Policy Lifecycle
```
GET    /policies/{id}           → policy details + config
PUT    /policies/{id}           → update policy config
PUT    /policies/{id}/dry-run   → start dry-run (no body, no Content-Type)
PUT    /policies/{id}/draft     → reset to draft
```

### Dry-Run Operations
```
POST   /policies/{id}/dry-run/user     → create virtual user (no body)
POST   /policies/{id}/dry-run/login    → login as virtual user { did }
POST   /policies/{id}/dry-run/restart  → restart dry-run
GET    /policies/{id}/blocks           → get visible blocks for current user
GET    /policies/{id}/tag/{tag}/blocks → get specific block by tag
POST   /policies/{id}/tag/{tag}/blocks → submit data to block
```

### Schema API (JSON Schema Draft 7)
```
POST   /schemas/{topicId}   → create schema on policy topic
PUT    /schemas/{id}/publish → publish schema (IRI changes to #uuid&version)
```

## Key Learnings

### Schema Requirements
- Entity must be `NONE`, `VC`, or `EVC` — NOT "MRV"
- Schemas MUST be on the same HCS topic as the policy — schemas on different topics are invisible
- API requires JSON Schema Draft 7 format with `$id`, `$comment`, `properties` using `fieldN` keys
- DRAFT schemas use `#uuid` IRI format; PUBLISHED use `#uuid&version`

### Block Configuration
- `documentsSourceAddon.filters` MUST be an array `[]`, never a plain object — Guardian calls `.filter()` on it
- `documentValidatorBlock` requires `documentType: "vc-document"`
- `mintDocumentBlock.tokenId` references actual Hedera token ID (e.g., `0.0.8163838`), not template tags
- `switchBlock.conditions` routes by field values with `executionFlow: "firstTrue"`
- `buttonBlock` events use `output: "Option_0"` / `"Option_1"` format

### Dry-Run Mode
- `PUT /dry-run` requires NO body and NO Content-Type header
- `POST /dry-run/user` also requires no Content-Type
- Virtual users get `NO_ROLE` initially, must select role via `policyRolesBlock`
- `POST /dry-run/login` with `{ "did": "..." }` switches user context

### Guardian Deployment
- Self-hosted: Docker Compose, ~12 core services, minimum 4 vCPU / 8GB RAM
- MGS (Managed): Free hosted at guardianservice.app — shared instance, can be unstable
- ED25519 keys ONLY for Hedera accounts (not ECDSA)
