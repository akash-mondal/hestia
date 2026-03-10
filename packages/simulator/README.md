# @zeno/simulator — OCEMS Data Generator

Production-grade OCEMS sensor data generator for Project Zeno. Produces regulatory-authentic effluent readings matching real CPCB data, CETP performance reports, and industry-specific discharge profiles.

**This layer is considered stable.** All parameter ranges are derived from real data sources.

---

## Architecture

```
Facility Config → Industry Profile → Scenario Mode → Correlated Generation → SensorReading
                                                    ↕
                                              Diurnal Patterns
                                              Inter-reading Drift
                                              Chemistry Invariants
```

## Module Reference

| Module | Purpose |
|--------|---------|
| `standards.ts` | CPCB Schedule-VI limits, 17 industry categories, 6 detailed industry profiles with realistic treated effluent ranges, generation scenarios |
| `facilities.ts` | 10 pre-configured facilities: 6 tanneries (Kanpur Jajmau), 1 distillery (ZLD), 1 pharma, 1 pulp & paper, 1 dye |
| `generators.ts` | Core generator with correlated parameters, diurnal patterns, batch/time-series support, 8 scenario modes |

> **Generator documentation**: See [`docs/generator.md`](docs/generator.md) for the complete reference — industry profiles, parameter correlations, scenario modes, diurnal patterns, and facility configurations.

---

## Quick Start

```typescript
import { generateSensorReading, generateBatch, generateTimeSeries, FACILITIES } from '@zeno/simulator';

// Single reading
const reading = generateSensorReading(FACILITIES[0]);

// Batch (15 readings, 1-min intervals)
const batch = generateBatch(FACILITIES[0], { scenario: 'chronic_violator' });

// 24h time-series (96 batches × 15 readings = 1,440 readings)
const series = generateTimeSeries(FACILITIES[0], {
  startTime: new Date(),
  batchCount: 96,
  scenario: 'normal',
});
```

## Running Tests

```bash
npx tsx packages/simulator/scripts/test-generator.ts
```

113 tests including 5,000-reading invariant stress tests, rate-of-change validation, and sub-millisecond performance benchmarks.
