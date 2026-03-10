#!/usr/bin/env npx tsx
/**
 * Zeno Ingestion Validator — Comprehensive Test Suite
 *
 * Tests all three validation tiers:
 *   Tier 1: Single reading validation (schema, ranges, chemistry, analyzer limits)
 *   Tier 2: Batch validation (flatline, rate-of-change, ordering, consistency)
 *   Quality codes: Structured severity and CPCB alert levels
 *
 * Run: npx tsx packages/blockchain/scripts/test-validator.ts
 */

import {
  validateSensorReading,
  validateBatch,
  validateSensorReadingLegacy,
  printValidationReport,
  ANALYZER_LIMITS,
  RATE_OF_CHANGE_LIMITS,
} from '../src/validator';
import type { SensorReading, SensorReadingBatch } from '../src/types';

// ============================================================
// Test Infrastructure
// ============================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    failures.push(testName);
    console.log(`  ✗ FAIL: ${testName}`);
  }
}

function assertHasCode(result: { issues: Array<{ code: string }> }, code: string, testName: string) {
  assert(result.issues.some(i => i.code === code), testName);
}

function assertNoCode(result: { issues: Array<{ code: string }> }, code: string, testName: string) {
  assert(!result.issues.some(i => i.code === code), testName);
}

// ============================================================
// Test Fixtures
// ============================================================

function makeValidReading(overrides: Partial<SensorReading> = {}): SensorReading {
  return {
    timestamp: new Date().toISOString(),
    facilityId: 'KNP-TAN-001',
    facilityDID: 'did:hedera:testnet:0.0.12345',
    pH: 7.2,
    BOD_mgL: 18,
    COD_mgL: 145,
    TSS_mgL: 55,
    temperature_C: 32,
    totalChromium_mgL: 0.8,
    hexChromium_mgL: 0.04,
    oilAndGrease_mgL: 4.5,
    ammoniacalN_mgL: 22,
    dissolvedOxygen_mgL: 5.2,
    flow_KLD: 450,
    sensorStatus: 'online',
    kmsKeyId: 'arn:aws:kms:us-east-1:123456789:key/test-key-id',
    kmsSigHash: '0xabc123def456...',
    ...overrides,
  };
}

function makeValidBatch(overrides: Partial<SensorReadingBatch> = {}, readingOverrides: Array<Partial<SensorReading>> = []): SensorReadingBatch {
  const now = Date.now();
  const readings: SensorReading[] = [];

  for (let i = 0; i < 5; i++) {
    readings.push(makeValidReading({
      timestamp: new Date(now - (4 - i) * 60_000).toISOString(),
      // Add >5% variation to avoid flatline detection across all parameters
      pH: 7.0 + (i * 0.2),
      BOD_mgL: 15 + i * 3,
      COD_mgL: 130 + i * 15,
      TSS_mgL: 45 + i * 6,
      temperature_C: 30 + i * 1.0,
      totalChromium_mgL: 0.6 + i * 0.15,
      hexChromium_mgL: 0.03 + i * 0.01,
      oilAndGrease_mgL: 3.5 + i * 1.0,
      ammoniacalN_mgL: 18 + i * 3,
      dissolvedOxygen_mgL: 4.0 + i * 0.8,
      flow_KLD: 400 + i * 40,
      ...(readingOverrides[i] || {}),
    }));
  }

  return {
    facilityId: 'KNP-TAN-001',
    batchId: 'batch-test-001',
    windowStart: new Date(now - 5 * 60_000).toISOString(),
    windowEnd: new Date(now).toISOString(),
    readingCount: readings.length,
    readings,
    averages: {
      pH: 7.5,
      BOD_mgL: 22,
      COD_mgL: 165,
      TSS_mgL: 61,
      temperature_C: 32.6,
      totalChromium_mgL: 0.9,
      hexChromium_mgL: 0.05,
      oilAndGrease_mgL: 5.5,
      ammoniacalN_mgL: 25,
      dissolvedOxygen_mgL: 5.8,
      flow_KLD: 480,
    },
    kmsKeyId: 'arn:aws:kms:us-east-1:123456789:key/test-key-id',
    kmsBatchSigHash: '0xbatch_sig_hash',
    transmissionMode: 'realtime',
    ...overrides,
  };
}

// ============================================================
// TIER 1: Single Reading Validation Tests
// ============================================================

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     ZENO INGESTION VALIDATOR — COMPREHENSIVE TEST SUITE    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── Happy Path ──
console.log('── Tier 1: Happy Path ──');
{
  const result = validateSensorReading(makeValidReading());
  assert(result.valid === true, 'Valid reading passes validation');
  assert(result.errorCount === 0, 'Valid reading has zero errors');
  assert(result.issues.filter(i => i.severity === 'error').length === 0, 'No error-severity issues');
}

// ── Schema: Missing Fields ──
console.log('\n── Tier 1: Missing Fields ──');
{
  const result = validateSensorReading({});
  assert(result.valid === false, 'Empty object fails validation');
  assertHasCode(result, 'MISSING_FIELD', 'Reports MISSING_FIELD code');
}
{
  const r = makeValidReading();
  delete (r as any).pH;
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Missing pH field fails');
  assert(result.issues.some(i => i.field === 'pH'), 'Reports pH as missing field');
}
{
  const r = makeValidReading();
  delete (r as any).kmsSigHash;
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Missing kmsSigHash fails');
}

// ── Schema: Invalid Types ──
console.log('\n── Tier 1: Invalid Types ──');
{
  const result = validateSensorReading(null);
  assert(result.valid === false, 'null input fails');
  assertHasCode(result, 'INVALID_TYPE', 'Reports INVALID_TYPE for null');
}
{
  const result = validateSensorReading('not an object');
  assert(result.valid === false, 'String input fails');
}
{
  const r = makeValidReading({ pH: 'seven' as any });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'String pH fails');
  assertHasCode(result, 'INVALID_NUMERIC', 'Reports INVALID_NUMERIC for string pH');
}
{
  const r = makeValidReading({ COD_mgL: NaN });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'NaN COD fails');
}

// ── Analyzer Range Limits ──
console.log('\n── Tier 1: Analyzer Range Limits ──');
{
  const r = makeValidReading({ pH: -0.5 });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'pH = -0.5 rejected');
  assertHasCode(result, 'BELOW_ANALYZER_MIN', 'BELOW_ANALYZER_MIN for negative pH');
}
{
  const r = makeValidReading({ pH: 14.5 });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'pH = 14.5 rejected (above analyzer max)');
}
{
  const r = makeValidReading({ COD_mgL: 1200 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'ABOVE_ANALYZER_MAX', 'COD = 1200 exceeds analyzer max (1000)');
}
{
  const r = makeValidReading({ BOD_mgL: 500 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'ABOVE_ANALYZER_MAX', 'BOD = 500 exceeds analyzer max (400)');
}
{
  const r = makeValidReading({ temperature_C: 65 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'ABOVE_ANALYZER_MAX', 'Temp = 65°C exceeds analyzer max (60)');
}
{
  const r = makeValidReading({ dissolvedOxygen_mgL: 25 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'ABOVE_ANALYZER_MAX', 'DO = 25 exceeds physical max (20)');
}
{
  const r = makeValidReading({ flow_KLD: -10 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'BELOW_ANALYZER_MIN', 'Negative flow rejected');
}

// ── Chemistry Constraints ──
console.log('\n── Tier 1: Chemistry Constraints ──');
{
  const r = makeValidReading({ COD_mgL: 20, BOD_mgL: 25 });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'COD < BOD rejected');
  assertHasCode(result, 'COD_LESS_THAN_BOD', 'Reports COD_LESS_THAN_BOD');
}
{
  const r = makeValidReading({ COD_mgL: 25, BOD_mgL: 25 });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'COD = BOD rejected (must be strictly greater)');
}
{
  // BOD/COD ratio too low (< 0.1) — toxic/non-biodegradable waste indicator
  const r = makeValidReading({ COD_mgL: 200, BOD_mgL: 15 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'BOD_COD_RATIO_LOW', 'BOD/COD ratio 0.075 flagged (< 0.1)');
  assert(result.valid === true, 'Low BOD/COD ratio is warning, not error');
}
{
  // BOD/COD ratio too high (> 0.8) — unusual for industrial
  const r = makeValidReading({ COD_mgL: 100, BOD_mgL: 85 });
  const result = validateSensorReading(r);
  assertHasCode(result, 'BOD_COD_RATIO_HIGH', 'BOD/COD ratio 0.85 flagged (> 0.8)');
}
{
  // Hexavalent Chromium > Total Chromium — physically impossible
  const r = makeValidReading({ totalChromium_mgL: 0.5, hexChromium_mgL: 0.8 });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Hex Cr > Total Cr rejected');
  assertHasCode(result, 'HEX_CR_EXCEEDS_TOTAL', 'Reports HEX_CR_EXCEEDS_TOTAL');
}
{
  // Valid case: Hex Cr = Total Cr (all chromium is hexavalent)
  const r = makeValidReading({ totalChromium_mgL: 0.5, hexChromium_mgL: 0.5 });
  const result = validateSensorReading(r);
  assertNoCode(result, 'HEX_CR_EXCEEDS_TOTAL', 'Hex Cr = Total Cr is allowed (all Cr is hexavalent)');
}

// ── Timestamp Sanity ──
console.log('\n── Tier 1: Timestamp Sanity ──');
{
  const r = makeValidReading({ timestamp: new Date(Date.now() + 120_000).toISOString() });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Future timestamp rejected');
  assertHasCode(result, 'FUTURE_TIMESTAMP', 'Reports FUTURE_TIMESTAMP');
}
{
  const r = makeValidReading({ timestamp: new Date(Date.now() - 48 * 60 * 60_000).toISOString() });
  const result = validateSensorReading(r);
  assertHasCode(result, 'STALE_TIMESTAMP', 'Stale timestamp (>24hr) flagged');
  assert(result.valid === true, 'Stale timestamp is warning, not error');
}
{
  const r = makeValidReading({ timestamp: 'not-a-date' });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Invalid timestamp format rejected');
  assertHasCode(result, 'INVALID_TIMESTAMP', 'Reports INVALID_TIMESTAMP');
}

// ── Sensor Status ──
console.log('\n── Tier 1: Sensor Status ──');
{
  const r = makeValidReading({ sensorStatus: 'broken' as any });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Invalid sensorStatus rejected');
  assertHasCode(result, 'INVALID_SENSOR_STATUS', 'Reports INVALID_SENSOR_STATUS');
}
{
  const r = makeValidReading({ sensorStatus: 'calibrating' });
  const result = validateSensorReading(r);
  assert(result.valid === true, 'Calibrating status is valid');
  assertHasCode(result, 'CALIBRATION_MODE', 'Reports CALIBRATION_MODE info');
  assert(result.issues.find(i => i.code === 'CALIBRATION_MODE')?.severity === 'info', 'Calibration mode is info severity');
}
{
  const r = makeValidReading({ sensorStatus: 'maintenance' });
  const result = validateSensorReading(r);
  assert(result.valid === true, 'Maintenance status is valid');
  assertHasCode(result, 'MAINTENANCE_MODE', 'Reports MAINTENANCE_MODE info');
}
{
  const r = makeValidReading({ sensorStatus: 'offline_queued' });
  const result = validateSensorReading(r);
  assert(result.valid === true, 'offline_queued is valid');
}

// ── KMS Signature ──
console.log('\n── Tier 1: KMS Signature ──');
{
  const r = makeValidReading({ kmsSigHash: '' });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Empty kmsSigHash rejected');
  assertHasCode(result, 'EMPTY_KMS_SIGNATURE', 'Reports EMPTY_KMS_SIGNATURE');
}
{
  const r = makeValidReading({ kmsKeyId: '' });
  const result = validateSensorReading(r);
  assert(result.valid === false, 'Empty kmsKeyId rejected');
  assertHasCode(result, 'EMPTY_KMS_KEY_ID', 'Reports EMPTY_KMS_KEY_ID');
}

// ── Legacy Wrapper ──
console.log('\n── Tier 1: Legacy Wrapper ──');
{
  const result = validateSensorReadingLegacy(makeValidReading());
  assert(result.valid === true, 'Legacy wrapper: valid reading passes');
  assert(result.errors.length === 0, 'Legacy wrapper: no errors');
}
{
  const r = makeValidReading({ pH: -1 });
  const result = validateSensorReadingLegacy(r);
  assert(result.valid === false, 'Legacy wrapper: invalid reading fails');
  assert(result.errors.length > 0, 'Legacy wrapper: has error messages');
}

// ============================================================
// TIER 2: Batch Validation Tests
// ============================================================

console.log('\n── Tier 2: Batch Happy Path ──');
{
  const batch = makeValidBatch();
  const result = validateBatch(batch);
  assert(result.valid === true, 'Valid batch passes validation');
  assert(result.errorCount === 0, 'Valid batch has zero errors');
  assert(result.totalReadings === 5, 'Batch reports 5 total readings');
  assert(result.validReadings === 5, 'All 5 readings valid');
  assert(result.rejectedReadings === 0, 'Zero rejected readings');
}

// ── Batch Schema ──
console.log('\n── Tier 2: Batch Schema ──');
{
  const result = validateBatch(null);
  assert(result.valid === false, 'null batch rejected');
}
{
  const result = validateBatch({ facilityId: 'test' });
  assert(result.valid === false, 'Incomplete batch rejected');
  assert(result.batchIssues.some(i => i.code === 'MISSING_BATCH_FIELD'), 'Reports MISSING_BATCH_FIELD');
}
{
  const batch = makeValidBatch({ readings: [] as any, readingCount: 0 });
  const result = validateBatch(batch);
  assert(result.valid === false, 'Empty batch rejected');
  assert(result.batchIssues.some(i => i.code === 'EMPTY_BATCH'), 'Reports EMPTY_BATCH');
}

// ── Reading Count Mismatch ──
console.log('\n── Tier 2: Reading Count ──');
{
  const batch = makeValidBatch({ readingCount: 10 });
  const result = validateBatch(batch);
  assert(result.batchIssues.some(i => i.code === 'READING_COUNT_MISMATCH'), 'Detects reading count mismatch');
}

// ── Facility ID Mismatch ──
console.log('\n── Tier 2: Facility ID Consistency ──');
{
  const batch = makeValidBatch();
  batch.readings[2].facilityId = 'DIFFERENT-FAC-001';
  const result = validateBatch(batch);
  assert(result.valid === false, 'Mismatched facility ID rejected');
  assert(result.batchIssues.some(i => i.code === 'FACILITY_ID_MISMATCH'), 'Reports FACILITY_ID_MISMATCH');
}

// ── Timestamp Ordering ──
console.log('\n── Tier 2: Timestamp Ordering ──');
{
  const batch = makeValidBatch();
  // Swap timestamps of readings 2 and 3 to break monotonicity
  const temp = batch.readings[2].timestamp;
  batch.readings[2].timestamp = batch.readings[3].timestamp;
  batch.readings[3].timestamp = temp;
  const result = validateBatch(batch);
  assert(result.batchIssues.some(i => i.code === 'TIMESTAMP_NOT_MONOTONIC'), 'Detects non-monotonic timestamps');
}

// ── Rate-of-Change Detection ──
console.log('\n── Tier 2: Rate-of-Change ──');
{
  // pH jump of 5 units between consecutive readings (max allowed: 2)
  const batch = makeValidBatch({}, [
    { pH: 7.0, COD_mgL: 145, BOD_mgL: 18 },
    { pH: 12.0, COD_mgL: 145, BOD_mgL: 18 },  // 5 unit jump!
    { pH: 7.1, COD_mgL: 145, BOD_mgL: 18 },
    { pH: 7.2, COD_mgL: 145, BOD_mgL: 18 },
    { pH: 7.3, COD_mgL: 145, BOD_mgL: 18 },
  ]);
  const result = validateBatch(batch);
  const rocIssues = result.batchIssues.filter(i => i.code === 'RATE_OF_CHANGE_EXCEEDED' && i.field === 'pH');
  assert(rocIssues.length >= 1, 'Detects pH jump of 5 units');
}
{
  // COD jump of 200 mg/L (max allowed: 150)
  const batch = makeValidBatch({}, [
    { COD_mgL: 100, BOD_mgL: 18 },
    { COD_mgL: 310, BOD_mgL: 18 },  // 210 mg/L jump!
    { COD_mgL: 120, BOD_mgL: 18 },
    { COD_mgL: 130, BOD_mgL: 18 },
    { COD_mgL: 140, BOD_mgL: 18 },
  ]);
  const result = validateBatch(batch);
  const rocIssues = result.batchIssues.filter(i => i.code === 'RATE_OF_CHANGE_EXCEEDED' && i.field === 'COD_mgL');
  assert(rocIssues.length >= 1, 'Detects COD jump of 210 mg/L');
}

// ── Flatline Detection ──
console.log('\n── Tier 2: Flatline Detection ──');
{
  // All COD readings identical = flatline (tampering indicator)
  const batch = makeValidBatch({}, [
    { COD_mgL: 200, BOD_mgL: 18, TSS_mgL: 55.0, temperature_C: 32.0, totalChromium_mgL: 0.8, hexChromium_mgL: 0.04, oilAndGrease_mgL: 4.5, ammoniacalN_mgL: 22, dissolvedOxygen_mgL: 5.2, flow_KLD: 450 },
    { COD_mgL: 200, BOD_mgL: 18, TSS_mgL: 55.0, temperature_C: 32.0, totalChromium_mgL: 0.8, hexChromium_mgL: 0.04, oilAndGrease_mgL: 4.5, ammoniacalN_mgL: 22, dissolvedOxygen_mgL: 5.2, flow_KLD: 450 },
    { COD_mgL: 200, BOD_mgL: 18, TSS_mgL: 55.0, temperature_C: 32.0, totalChromium_mgL: 0.8, hexChromium_mgL: 0.04, oilAndGrease_mgL: 4.5, ammoniacalN_mgL: 22, dissolvedOxygen_mgL: 5.2, flow_KLD: 450 },
    { COD_mgL: 200, BOD_mgL: 18, TSS_mgL: 55.0, temperature_C: 32.0, totalChromium_mgL: 0.8, hexChromium_mgL: 0.04, oilAndGrease_mgL: 4.5, ammoniacalN_mgL: 22, dissolvedOxygen_mgL: 5.2, flow_KLD: 450 },
    { COD_mgL: 200, BOD_mgL: 18, TSS_mgL: 55.0, temperature_C: 32.0, totalChromium_mgL: 0.8, hexChromium_mgL: 0.04, oilAndGrease_mgL: 4.5, ammoniacalN_mgL: 22, dissolvedOxygen_mgL: 5.2, flow_KLD: 450 },
  ]);
  const result = validateBatch(batch);
  const flatlineIssues = result.batchIssues.filter(i => i.code === 'FLATLINE_DETECTED');
  assert(flatlineIssues.length > 0, 'Detects flatline across multiple parameters');
  // pH should NOT trigger flatline (per CPCB protocol, pH excluded)
  const phFlatline = flatlineIssues.find(i => i.field === 'pH');
  assert(!phFlatline, 'pH excluded from flatline detection (per CPCB protocol)');
  // COD should trigger flatline
  const codFlatline = flatlineIssues.find(i => i.field === 'COD_mgL');
  assert(!!codFlatline, 'COD flatline detected');
  // Flatline is warning, not error
  assert(flatlineIssues.every(i => i.severity === 'warning'), 'Flatline is warning severity');
  assert(flatlineIssues.every(i => i.alertLevel === 'yellow'), 'Flatline maps to CPCB Yellow alert');
}
{
  // Readings with sufficient variation should NOT trigger flatline
  const batch = makeValidBatch();  // default batch has variation built in
  const result = validateBatch(batch);
  const flatlineIssues = result.batchIssues.filter(i => i.code === 'FLATLINE_DETECTED');
  assert(flatlineIssues.length === 0, 'Normal variation does not trigger flatline');
}

// ── Window Bounds ──
console.log('\n── Tier 2: Window Bounds ──');
{
  const now = Date.now();
  const batch = makeValidBatch({
    windowStart: new Date(now - 30 * 60_000).toISOString(),
    windowEnd: new Date(now).toISOString(),
  });
  const result = validateBatch(batch);
  assert(result.batchIssues.some(i => i.code === 'WINDOW_TOO_WIDE'), 'Detects window > 15 minutes');
}
{
  const now = Date.now();
  const batch = makeValidBatch({
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(now - 5 * 60_000).toISOString(),
  });
  const result = validateBatch(batch);
  assert(result.batchIssues.some(i => i.code === 'WINDOW_INVERTED'), 'Detects inverted window');
}

// ── Per-Reading Validation Within Batch ──
console.log('\n── Tier 2: Per-Reading Validation ──');
{
  // One bad reading in an otherwise good batch
  const batch = makeValidBatch();
  batch.readings[2].pH = -1;  // invalid reading
  const result = validateBatch(batch);
  assert(result.valid === false, 'Batch fails if any reading is invalid');
  assert(result.rejectedReadings === 1, 'Reports exactly 1 rejected reading');
  assert(result.validReadings === 4, 'Reports 4 valid readings');
  assert(result.readingResults[2].valid === false, 'Reading #2 specifically flagged as invalid');
}

// ============================================================
// Quality Codes and CPCB Alert Levels
// ============================================================

console.log('\n── Quality Codes & Alert Levels ──');
{
  const r = makeValidReading({ pH: -1 });
  const result = validateSensorReading(r);
  assert(result.qualityCodes.includes('BELOW_ANALYZER_MIN'), 'Quality codes include BELOW_ANALYZER_MIN');
  const issue = result.issues.find(i => i.code === 'BELOW_ANALYZER_MIN');
  assert(issue?.alertLevel === 'red', 'Below analyzer min maps to RED alert');
}
{
  const r = makeValidReading({ COD_mgL: 1200 });
  const result = validateSensorReading(r);
  const issue = result.issues.find(i => i.code === 'ABOVE_ANALYZER_MAX');
  assert(issue?.alertLevel === 'orange', 'Above analyzer max maps to ORANGE alert');
}
{
  const r = makeValidReading({ sensorStatus: 'calibrating' });
  const result = validateSensorReading(r);
  const issue = result.issues.find(i => i.code === 'CALIBRATION_MODE');
  assert(issue?.alertLevel === 'none', 'Calibration mode has no alert level');
  assert(issue?.severity === 'info', 'Calibration mode is info severity');
}

// ============================================================
// Validation Report Output
// ============================================================

console.log('\n── Validation Report Output ──');
{
  // Generate a report for a batch with mixed issues
  const batch = makeValidBatch({}, [
    { COD_mgL: 200, BOD_mgL: 18 },
    { COD_mgL: 200, BOD_mgL: 18 },
    { COD_mgL: 200, BOD_mgL: 18 },
    { COD_mgL: 200, BOD_mgL: 18 },
    { COD_mgL: 200, BOD_mgL: 18 },
  ]);
  const result = validateBatch(batch);
  const report = printValidationReport(result);
  assert(report.includes('ZENO INGESTION VALIDATION REPORT'), 'Report contains header');
  assert(report.includes('batch-test-001'), 'Report contains batch ID');
  console.log('\n  Sample report output:');
  console.log(report.split('\n').map(l => '    ' + l).join('\n'));
}

// ============================================================
// Stress Test: 1000 Valid Readings
// ============================================================

console.log('\n── Stress Test: 1000 Valid Readings ──');
{
  const start = Date.now();
  let allPassed = true;

  for (let i = 0; i < 1000; i++) {
    const reading = makeValidReading({
      pH: 6.5 + Math.random() * 2,
      BOD_mgL: 5 + Math.random() * 20,
      COD_mgL: 50 + Math.random() * 150,
      TSS_mgL: 20 + Math.random() * 60,
      temperature_C: 25 + Math.random() * 10,
      totalChromium_mgL: 0.1 + Math.random() * 1.4,
      hexChromium_mgL: 0.01 + Math.random() * 0.07,
      oilAndGrease_mgL: 2 + Math.random() * 6,
      ammoniacalN_mgL: 5 + Math.random() * 30,
      dissolvedOxygen_mgL: 2 + Math.random() * 8,
      flow_KLD: 100 + Math.random() * 800,
    });

    const result = validateSensorReading(reading);
    if (!result.valid) {
      allPassed = false;
      console.log(`  ✗ Reading ${i} failed unexpectedly:`, result.issues.filter(i => i.severity === 'error').map(i => i.message));
      break;
    }
  }

  const elapsed = Date.now() - start;
  assert(allPassed, `1000 valid readings all pass (${elapsed}ms)`);
  assert(elapsed < 5000, `1000 readings validated in <5s (actual: ${elapsed}ms)`);
}

// ── Stress Test: 1000 readings with guaranteed COD > BOD ──
console.log('\n── Stress Test: COD > BOD Invariant ──');
{
  let codBodInvariant = true;
  for (let i = 0; i < 1000; i++) {
    const bod = 5 + Math.random() * 20;
    const cod = bod + 10 + Math.random() * 150;  // always > BOD
    const reading = makeValidReading({ BOD_mgL: bod, COD_mgL: cod });
    const result = validateSensorReading(reading);
    if (result.issues.some(i => i.code === 'COD_LESS_THAN_BOD')) {
      codBodInvariant = false;
      break;
    }
  }
  assert(codBodInvariant, '1000 readings: COD > BOD invariant holds when properly generated');
}

// ============================================================
// Edge Cases
// ============================================================

console.log('\n── Edge Cases ──');
{
  // Zero flow is legitimate (ZLD facility with no discharge)
  const r = makeValidReading({ flow_KLD: 0 });
  const result = validateSensorReading(r);
  assertNoCode(result, 'BELOW_ANALYZER_MIN', 'Zero flow is allowed (ZLD facility)');
}
{
  // pH at exact boundary values
  const r1 = makeValidReading({ pH: 0 });
  const result1 = validateSensorReading(r1);
  assertNoCode(result1, 'BELOW_ANALYZER_MIN', 'pH = 0 is within analyzer range');

  const r2 = makeValidReading({ pH: 14 });
  const result2 = validateSensorReading(r2);
  assertNoCode(result2, 'ABOVE_ANALYZER_MAX', 'pH = 14 is within analyzer range');
}
{
  // Hex Cr = 0 and Total Cr = 0 (no chromium at all)
  const r = makeValidReading({ totalChromium_mgL: 0, hexChromium_mgL: 0 });
  const result = validateSensorReading(r);
  assertNoCode(result, 'HEX_CR_EXCEEDS_TOTAL', 'Both Cr values at 0 is allowed');
}
{
  // BOD and COD both very small but valid
  const r = makeValidReading({ BOD_mgL: 0.5, COD_mgL: 1.0 });
  const result = validateSensorReading(r);
  assert(result.valid === true, 'Very small but valid BOD/COD passes');
}

// ============================================================
// Results Summary
// ============================================================

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
console.log('╚══════════════════════════════════════════════════════════════╝');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  for (const f of failures) {
    console.log(`  ✗ ${f}`);
  }
  process.exit(1);
} else {
  console.log('\n✓ All tests passed.\n');
}
