/**
 * Zeno Ingestion Validator — Production-Grade OCEMS Data Validation
 *
 * Three-tier validation matching real CPCB OCEMS architecture:
 *
 * Tier 1: Single Reading Validation
 *   - Schema completeness (all required fields present)
 *   - Type correctness (numbers are numbers, strings are strings)
 *   - Analyzer range limits (COD 0-1000, BOD 0-400, pH 0-14, etc.)
 *   - Chemistry constraints (COD > BOD, BOD/COD ratio 0.1-0.8, HexCr ≤ TotalCr)
 *   - Timestamp sanity (no future, no >24hr stale)
 *   - Sensor status enum validation
 *   - KMS signature presence
 *
 * Tier 2: Batch Validation
 *   - Monotonic timestamp ordering within batch
 *   - Flatline detection (±5% min variation per CPCB August 2025 protocol)
 *   - Rate-of-change validation (no impossible jumps between consecutive readings)
 *   - Batch metadata consistency (facilityId, readingCount, window bounds)
 *   - Individual reading validation (Tier 1 applied to each reading)
 *
 * Tier 3: Validation Quality Codes
 *   - Not binary pass/fail — structured severity levels matching CPCB alert matrix
 *   - Each issue tagged with a quality code, severity, and CPCB alert level
 *   - Deterministic and reproducible for legal/audit purposes
 *
 * References:
 *   - CPCB Revised OCEMS Guidelines August 2018 (Section 5.4.4, 5.4.5)
 *   - CPCB Online Automated Alerts Generation Protocol August 2025
 *   - CPCB Revised OCEMS Calibration Protocol July 2025
 *   - OCEMS analyzer specs: pH ±1%, COD/BOD/TSS ±5%, Temp ±0.5°C
 */

import type { SensorReading, SensorReadingBatch } from './types';

// ============================================================
// OCEMS Analyzer Physical Limits
// Values beyond these are instrument errors, not real readings.
// Based on standard CPCB-approved analyzer specifications.
// ============================================================

export const ANALYZER_LIMITS = {
  pH:                  { min: 0,   max: 14    },
  BOD_mgL:             { min: 0,   max: 400   },
  COD_mgL:             { min: 0,   max: 1000  },
  TSS_mgL:             { min: 0,   max: 1000  },
  temperature_C:       { min: -10, max: 60    },
  totalChromium_mgL:   { min: 0,   max: 50    },
  hexChromium_mgL:     { min: 0,   max: 10    },
  oilAndGrease_mgL:    { min: 0,   max: 200   },
  ammoniacalN_mgL:     { min: 0,   max: 500   },
  dissolvedOxygen_mgL: { min: 0,   max: 20    },
  flow_KLD:            { min: 0,   max: 100000 },
} as const;

// ============================================================
// Rate-of-Change Limits (max change between consecutive 1-min readings)
// Based on physical process limits — sudden jumps indicate sensor malfunction.
// ============================================================

export const RATE_OF_CHANGE_LIMITS = {
  pH:                  2.0,    // max 2 pH units per minute
  BOD_mgL:             50,     // max 50 mg/L jump
  COD_mgL:             150,    // max 150 mg/L jump
  TSS_mgL:             100,    // max 100 mg/L jump
  temperature_C:       5,      // max 5°C jump per minute
  totalChromium_mgL:   1.0,    // max 1 mg/L jump
  hexChromium_mgL:     0.5,    // max 0.5 mg/L jump
  oilAndGrease_mgL:    10,     // max 10 mg/L jump
  ammoniacalN_mgL:     20,     // max 20 mg/L jump
  dissolvedOxygen_mgL: 5,      // max 5 mg/L jump
} as const;

// Flatline threshold: minimum variation required over a batch
// CPCB August 2025 protocol: ±5% for ETP parameters, pH excluded
export const FLATLINE_VARIATION_THRESHOLD = 0.05;  // 5%

// ============================================================
// Validation Quality Codes
// ============================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type CPCBAlertLevel = 'none' | 'yellow' | 'orange' | 'red';

export interface ValidationIssue {
  code: string;                  // machine-readable code (e.g., "RANGE_EXCEEDED")
  field?: string;                // which field triggered it
  severity: ValidationSeverity;  // error = reject, warning = accept with flag, info = log
  alertLevel: CPCBAlertLevel;    // maps to CPCB August 2025 alert protocol
  message: string;               // human-readable description
  value?: number | string;       // the actual value that triggered the issue
  limit?: number | string;       // the limit that was violated
}

export interface ReadingValidationResult {
  valid: boolean;                // true if no errors (warnings/info allowed)
  readingIndex?: number;         // position in batch (if batch validation)
  timestamp?: string;            // reading timestamp for traceability
  issues: ValidationIssue[];
  qualityCodes: string[];        // summary list of all issue codes
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface BatchValidationResult {
  valid: boolean;                // true if batch-level AND all readings pass
  batchId?: string;
  facilityId?: string;
  totalReadings: number;
  validReadings: number;
  rejectedReadings: number;
  batchIssues: ValidationIssue[];     // batch-level issues (flatline, ordering, etc.)
  readingResults: ReadingValidationResult[];  // per-reading validation
  qualityCodes: string[];             // all unique codes across batch + readings
  errorCount: number;
  warningCount: number;
}

// ============================================================
// Tier 1: Single Reading Validation
// ============================================================

const REQUIRED_FIELDS = [
  'timestamp', 'facilityId', 'facilityDID', 'pH', 'BOD_mgL', 'COD_mgL',
  'TSS_mgL', 'temperature_C', 'totalChromium_mgL', 'hexChromium_mgL',
  'oilAndGrease_mgL', 'ammoniacalN_mgL', 'dissolvedOxygen_mgL',
  'flow_KLD', 'sensorStatus', 'kmsKeyId', 'kmsSigHash',
] as const;

const NUMERIC_FIELDS = [
  'pH', 'BOD_mgL', 'COD_mgL', 'TSS_mgL', 'temperature_C',
  'totalChromium_mgL', 'hexChromium_mgL', 'oilAndGrease_mgL',
  'ammoniacalN_mgL', 'dissolvedOxygen_mgL', 'flow_KLD',
] as const;

const VALID_SENSOR_STATUSES = ['online', 'offline_queued', 'reconnected_batch', 'maintenance', 'calibrating'];

/**
 * Validate a single sensor reading against all Tier 1 checks.
 * Returns structured result with quality codes, not just pass/fail.
 */
export function validateSensorReading(reading: unknown): ReadingValidationResult {
  const issues: ValidationIssue[] = [];

  // ── Schema: must be non-null object ──
  if (!reading || typeof reading !== 'object') {
    issues.push({
      code: 'INVALID_TYPE',
      severity: 'error',
      alertLevel: 'red',
      message: 'Reading must be a non-null object',
    });
    return buildResult(issues);
  }

  const r = reading as Record<string, unknown>;

  // ── Schema: required fields ──
  for (const field of REQUIRED_FIELDS) {
    if (r[field] === undefined || r[field] === null) {
      issues.push({
        code: 'MISSING_FIELD',
        field,
        severity: 'error',
        alertLevel: 'red',
        message: `Missing required field: ${field}`,
      });
    }
  }

  // If required fields are missing, no point continuing
  if (issues.some(i => i.code === 'MISSING_FIELD')) {
    return buildResult(issues);
  }

  // ── Type: numeric fields must be valid numbers ──
  for (const field of NUMERIC_FIELDS) {
    if (typeof r[field] !== 'number' || isNaN(r[field] as number)) {
      issues.push({
        code: 'INVALID_NUMERIC',
        field,
        severity: 'error',
        alertLevel: 'red',
        message: `${field} must be a valid number, got: ${typeof r[field]}`,
        value: String(r[field]),
      });
    }
  }

  if (issues.some(i => i.code === 'INVALID_NUMERIC')) {
    return buildResult(issues);
  }

  const sr = r as unknown as SensorReading;

  // ── Analyzer Range Limits ──
  // Values beyond analyzer physical range = instrument error
  for (const field of NUMERIC_FIELDS) {
    const val = sr[field as keyof SensorReading] as number;
    const limits = ANALYZER_LIMITS[field as keyof typeof ANALYZER_LIMITS];
    if (!limits) continue;

    if (val < limits.min) {
      issues.push({
        code: 'BELOW_ANALYZER_MIN',
        field,
        severity: 'error',
        alertLevel: 'red',
        message: `${field} = ${val} is below analyzer minimum (${limits.min})`,
        value: val,
        limit: limits.min,
      });
    }

    if (val > limits.max) {
      issues.push({
        code: 'ABOVE_ANALYZER_MAX',
        field,
        severity: 'error',
        alertLevel: 'orange',
        message: `${field} = ${val} exceeds analyzer maximum (${limits.max})`,
        value: val,
        limit: limits.max,
      });
    }
  }

  // ── Chemistry: COD must be greater than BOD ──
  // COD measures ALL organics (chemical oxidation), BOD only biodegradable fraction.
  if (sr.COD_mgL <= sr.BOD_mgL) {
    issues.push({
      code: 'COD_LESS_THAN_BOD',
      severity: 'error',
      alertLevel: 'orange',
      message: `COD (${sr.COD_mgL}) must be > BOD (${sr.BOD_mgL}) — fundamental chemistry constraint`,
      value: sr.COD_mgL,
      limit: sr.BOD_mgL,
    });
  }

  // ── Chemistry: BOD/COD ratio should be 0.1–0.8 for typical industrial wastewater ──
  // Below 0.1 = toxic/non-biodegradable waste (sensor likely miscalibrated)
  // Above 0.8 = highly biodegradable (unusual for industrial effluent, possible for food processing)
  if (sr.COD_mgL > 0 && sr.BOD_mgL > 0) {
    const ratio = sr.BOD_mgL / sr.COD_mgL;
    if (ratio < 0.1) {
      issues.push({
        code: 'BOD_COD_RATIO_LOW',
        severity: 'warning',
        alertLevel: 'yellow',
        message: `BOD/COD ratio = ${ratio.toFixed(3)} is below 0.1 — indicates toxic/non-biodegradable waste or sensor miscalibration`,
        value: ratio,
        limit: 0.1,
      });
    }
    if (ratio > 0.8) {
      issues.push({
        code: 'BOD_COD_RATIO_HIGH',
        severity: 'warning',
        alertLevel: 'yellow',
        message: `BOD/COD ratio = ${ratio.toFixed(3)} is above 0.8 — unusual for industrial effluent, verify sensor calibration`,
        value: ratio,
        limit: 0.8,
      });
    }
  }

  // ── Chemistry: Hexavalent Chromium ≤ Total Chromium ──
  // Hex-Cr is a subset of Total Cr. If hex > total, sensor is broken.
  if (sr.hexChromium_mgL > sr.totalChromium_mgL) {
    issues.push({
      code: 'HEX_CR_EXCEEDS_TOTAL',
      severity: 'error',
      alertLevel: 'orange',
      message: `Hexavalent Cr (${sr.hexChromium_mgL}) cannot exceed Total Cr (${sr.totalChromium_mgL})`,
      value: sr.hexChromium_mgL,
      limit: sr.totalChromium_mgL,
    });
  }

  // ── Timestamp sanity ──
  if (typeof sr.timestamp === 'string') {
    const ts = new Date(sr.timestamp).getTime();
    const now = Date.now();

    if (isNaN(ts)) {
      issues.push({
        code: 'INVALID_TIMESTAMP',
        field: 'timestamp',
        severity: 'error',
        alertLevel: 'red',
        message: 'Invalid timestamp format — must be ISO 8601',
        value: sr.timestamp,
      });
    } else {
      if (ts > now + 60_000) {
        issues.push({
          code: 'FUTURE_TIMESTAMP',
          field: 'timestamp',
          severity: 'error',
          alertLevel: 'red',
          message: `Timestamp is in the future: ${sr.timestamp}`,
          value: sr.timestamp,
        });
      }
      if (ts < now - 86_400_000) {
        issues.push({
          code: 'STALE_TIMESTAMP',
          field: 'timestamp',
          severity: 'warning',
          alertLevel: 'yellow',
          message: `Timestamp is more than 24 hours old: ${sr.timestamp}`,
          value: sr.timestamp,
        });
      }
    }
  }

  // ── Sensor status enum ──
  if (!VALID_SENSOR_STATUSES.includes(sr.sensorStatus as string)) {
    issues.push({
      code: 'INVALID_SENSOR_STATUS',
      field: 'sensorStatus',
      severity: 'error',
      alertLevel: 'red',
      message: `Invalid sensorStatus: "${sr.sensorStatus}" — must be one of: ${VALID_SENSOR_STATUSES.join(', ')}`,
      value: sr.sensorStatus,
    });
  }

  // ── Calibration-aware: readings during calibration are informational ──
  if (sr.sensorStatus === 'calibrating') {
    issues.push({
      code: 'CALIBRATION_MODE',
      field: 'sensorStatus',
      severity: 'info',
      alertLevel: 'none',
      message: 'Reading captured during calibration — data is informational, not for compliance evaluation',
    });
  }

  // ── Maintenance-aware: readings during maintenance are informational ──
  if (sr.sensorStatus === 'maintenance') {
    issues.push({
      code: 'MAINTENANCE_MODE',
      field: 'sensorStatus',
      severity: 'info',
      alertLevel: 'none',
      message: 'Reading captured during maintenance — data is informational, not for compliance evaluation',
    });
  }

  // ── KMS signature hash presence ──
  if (typeof sr.kmsSigHash === 'string' && sr.kmsSigHash.length === 0) {
    issues.push({
      code: 'EMPTY_KMS_SIGNATURE',
      field: 'kmsSigHash',
      severity: 'error',
      alertLevel: 'red',
      message: 'kmsSigHash cannot be empty — all readings must be KMS-signed',
    });
  }

  if (typeof sr.kmsKeyId === 'string' && sr.kmsKeyId.length === 0) {
    issues.push({
      code: 'EMPTY_KMS_KEY_ID',
      field: 'kmsKeyId',
      severity: 'error',
      alertLevel: 'red',
      message: 'kmsKeyId cannot be empty — device identity must be traceable',
    });
  }

  return buildResult(issues, sr.timestamp);
}

// ============================================================
// Tier 2: Batch Validation
// ============================================================

/**
 * Validate a sensor reading batch — includes per-reading Tier 1 validation
 * plus batch-level checks (flatline, rate-of-change, ordering, consistency).
 *
 * This is the primary validation entry point for production use.
 * A batch represents a 15-minute transmission window of up to 15 readings.
 */
export function validateBatch(batch: unknown): BatchValidationResult {
  const batchIssues: ValidationIssue[] = [];

  // ── Batch object validation ──
  if (!batch || typeof batch !== 'object') {
    batchIssues.push({
      code: 'INVALID_BATCH_TYPE',
      severity: 'error',
      alertLevel: 'red',
      message: 'Batch must be a non-null object',
    });
    return buildBatchResult(batchIssues, []);
  }

  const b = batch as Record<string, unknown>;

  // ── Required batch fields ──
  const requiredBatchFields = ['facilityId', 'batchId', 'windowStart', 'windowEnd', 'readingCount', 'readings'];
  for (const field of requiredBatchFields) {
    if (b[field] === undefined || b[field] === null) {
      batchIssues.push({
        code: 'MISSING_BATCH_FIELD',
        field,
        severity: 'error',
        alertLevel: 'red',
        message: `Missing required batch field: ${field}`,
      });
    }
  }

  if (batchIssues.length > 0) {
    return buildBatchResult(batchIssues, []);
  }

  const sb = batch as SensorReadingBatch;

  // ── Readings array validation ──
  if (!Array.isArray(sb.readings)) {
    batchIssues.push({
      code: 'READINGS_NOT_ARRAY',
      severity: 'error',
      alertLevel: 'red',
      message: 'batch.readings must be an array',
    });
    return buildBatchResult(batchIssues, []);
  }

  if (sb.readings.length === 0) {
    batchIssues.push({
      code: 'EMPTY_BATCH',
      severity: 'error',
      alertLevel: 'red',
      message: 'Batch contains no readings',
    });
    return buildBatchResult(batchIssues, []);
  }

  // ── Reading count consistency ──
  if (sb.readingCount !== sb.readings.length) {
    batchIssues.push({
      code: 'READING_COUNT_MISMATCH',
      severity: 'warning',
      alertLevel: 'yellow',
      message: `readingCount (${sb.readingCount}) does not match actual readings length (${sb.readings.length})`,
      value: sb.readingCount,
      limit: sb.readings.length,
    });
  }

  // ── Max batch size (15 readings per 15-min window) ──
  if (sb.readings.length > 15) {
    batchIssues.push({
      code: 'BATCH_TOO_LARGE',
      severity: 'warning',
      alertLevel: 'yellow',
      message: `Batch has ${sb.readings.length} readings — max 15 per 15-minute window`,
      value: sb.readings.length,
      limit: 15,
    });
  }

  // ── Window bounds validation ──
  const windowStart = new Date(sb.windowStart).getTime();
  const windowEnd = new Date(sb.windowEnd).getTime();
  if (!isNaN(windowStart) && !isNaN(windowEnd)) {
    const windowDuration = windowEnd - windowStart;
    // 15-min window = 900,000ms, allow some tolerance (16 min)
    if (windowDuration > 960_000) {
      batchIssues.push({
        code: 'WINDOW_TOO_WIDE',
        severity: 'warning',
        alertLevel: 'yellow',
        message: `Batch window spans ${(windowDuration / 60_000).toFixed(1)} minutes — expected ≤15 minutes`,
        value: windowDuration / 60_000,
        limit: 15,
      });
    }
    if (windowDuration < 0) {
      batchIssues.push({
        code: 'WINDOW_INVERTED',
        severity: 'error',
        alertLevel: 'red',
        message: 'windowEnd is before windowStart',
      });
    }
  }

  // ── Facility ID consistency ──
  for (let i = 0; i < sb.readings.length; i++) {
    if (sb.readings[i].facilityId !== sb.facilityId) {
      batchIssues.push({
        code: 'FACILITY_ID_MISMATCH',
        severity: 'error',
        alertLevel: 'red',
        message: `Reading ${i} facilityId "${sb.readings[i].facilityId}" does not match batch facilityId "${sb.facilityId}"`,
        value: sb.readings[i].facilityId,
        limit: sb.facilityId,
      });
    }
  }

  // ── Tier 1: Validate each reading individually ──
  const readingResults: ReadingValidationResult[] = sb.readings.map((reading, idx) => {
    const result = validateSensorReading(reading);
    result.readingIndex = idx;
    return result;
  });

  // ── Monotonic timestamp ordering ──
  const timestamps = sb.readings.map(r => new Date(r.timestamp).getTime());
  for (let i = 1; i < timestamps.length; i++) {
    if (!isNaN(timestamps[i]) && !isNaN(timestamps[i - 1])) {
      if (timestamps[i] <= timestamps[i - 1]) {
        batchIssues.push({
          code: 'TIMESTAMP_NOT_MONOTONIC',
          severity: 'error',
          alertLevel: 'orange',
          message: `Reading ${i} timestamp (${sb.readings[i].timestamp}) is not after reading ${i - 1} (${sb.readings[i - 1].timestamp})`,
          value: sb.readings[i].timestamp,
          limit: sb.readings[i - 1].timestamp,
        });
      }
    }
  }

  // ── Rate-of-Change Validation ──
  // Detect impossible jumps between consecutive 1-minute readings.
  // CPCB rejects "impossible jumps" (e.g., pH 7.2 → 2.1 → 7.3)
  const rocFields = Object.keys(RATE_OF_CHANGE_LIMITS) as Array<keyof typeof RATE_OF_CHANGE_LIMITS>;

  for (let i = 1; i < sb.readings.length; i++) {
    for (const field of rocFields) {
      const current = sb.readings[i][field as keyof SensorReading] as number;
      const previous = sb.readings[i - 1][field as keyof SensorReading] as number;

      if (typeof current !== 'number' || typeof previous !== 'number') continue;

      const change = Math.abs(current - previous);
      const limit = RATE_OF_CHANGE_LIMITS[field];

      if (change > limit) {
        batchIssues.push({
          code: 'RATE_OF_CHANGE_EXCEEDED',
          field,
          severity: 'warning',
          alertLevel: 'yellow',
          message: `${field} jumped ${change.toFixed(2)} between readings ${i - 1}→${i} (max ${limit}/min). Previous: ${previous}, Current: ${current}`,
          value: change,
          limit,
        });
      }
    }
  }

  // ── Flatline Detection ──
  // CPCB August 2025: values constant without ±5% variation = tampering indicator.
  // We check within the batch (15-min window). Full 48-hour detection is in the AI agent layer.
  // pH is excluded from flatline detection per CPCB protocol.
  const flatlineFields = NUMERIC_FIELDS.filter(f => f !== 'pH');

  for (const field of flatlineFields) {
    const values = sb.readings.map(r => r[field as keyof SensorReading] as number).filter(v => typeof v === 'number');

    if (values.length < 3) continue;  // need at least 3 readings to detect flatline

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    if (mean === 0) continue;  // avoid division by zero, zero flow is legitimate

    const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean)));
    const variationPercent = maxDeviation / Math.abs(mean);

    if (variationPercent < FLATLINE_VARIATION_THRESHOLD) {
      batchIssues.push({
        code: 'FLATLINE_DETECTED',
        field,
        severity: 'warning',
        alertLevel: 'yellow',
        message: `${field} shows <${(FLATLINE_VARIATION_THRESHOLD * 100).toFixed(0)}% variation across ${values.length} readings (max deviation: ${(variationPercent * 100).toFixed(2)}%). CPCB flags constant readings as potential tampering.`,
        value: variationPercent,
        limit: FLATLINE_VARIATION_THRESHOLD,
      });
    }
  }

  return buildBatchResult(batchIssues, readingResults, sb.batchId, sb.facilityId);
}

// ============================================================
// Legacy-compatible wrapper (preserves existing API)
// ============================================================

/**
 * Legacy validation interface for backward compatibility.
 * Wraps the new structured validation into the old { valid, errors } format.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSensorReadingLegacy(reading: unknown): ValidationResult {
  const result = validateSensorReading(reading);
  return {
    valid: result.valid,
    errors: result.issues.filter(i => i.severity === 'error').map(i => i.message),
  };
}

// ============================================================
// Summary / Reporting
// ============================================================

/**
 * Print a human-readable validation report for console/demo output.
 */
export function printValidationReport(result: ReadingValidationResult | BatchValidationResult): string {
  const lines: string[] = [];

  if ('batchId' in result && result.batchId) {
    // Batch result
    const br = result as BatchValidationResult;
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│           ZENO INGESTION VALIDATION REPORT                 │');
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');
    lines.push(`  Batch ID:     ${br.batchId}`);
    lines.push(`  Facility:     ${br.facilityId}`);
    lines.push(`  Status:       ${br.valid ? '✓ ACCEPTED' : '✗ REJECTED'}`);
    lines.push(`  Readings:     ${br.validReadings}/${br.totalReadings} valid (${br.rejectedReadings} rejected)`);
    lines.push(`  Errors:       ${br.errorCount}`);
    lines.push(`  Warnings:     ${br.warningCount}`);
    lines.push('');

    if (br.batchIssues.length > 0) {
      lines.push('  ── Batch-Level Issues ──');
      for (const issue of br.batchIssues) {
        const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
        const alert = issue.alertLevel !== 'none' ? ` [${issue.alertLevel.toUpperCase()}]` : '';
        lines.push(`  ${icon} [${issue.code}]${alert} ${issue.message}`);
      }
      lines.push('');
    }

    // Show per-reading issues (only those with issues)
    const readingsWithIssues = br.readingResults.filter(r => r.issues.length > 0);
    if (readingsWithIssues.length > 0) {
      lines.push('  ── Per-Reading Issues ──');
      for (const rr of readingsWithIssues) {
        lines.push(`  Reading #${rr.readingIndex ?? '?'} (${rr.timestamp ?? 'unknown'}):`);
        for (const issue of rr.issues) {
          const icon = issue.severity === 'error' ? '  ✗' : issue.severity === 'warning' ? '  ⚠' : '  ℹ';
          lines.push(`  ${icon} [${issue.code}] ${issue.message}`);
        }
      }
    }
  } else {
    // Single reading result
    const rr = result as ReadingValidationResult;
    lines.push(`  Validation: ${rr.valid ? '✓ ACCEPTED' : '✗ REJECTED'}`);
    lines.push(`  Errors: ${rr.errorCount} | Warnings: ${rr.warningCount} | Info: ${rr.infoCount}`);

    if (rr.issues.length > 0) {
      for (const issue of rr.issues) {
        const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ';
        const alert = issue.alertLevel !== 'none' ? ` [${issue.alertLevel.toUpperCase()}]` : '';
        lines.push(`  ${icon} [${issue.code}]${alert} ${issue.message}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ============================================================
// Internal Helpers
// ============================================================

function buildResult(issues: ValidationIssue[], timestamp?: string): ReadingValidationResult {
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    valid: errorCount === 0,
    timestamp,
    issues,
    qualityCodes: [...new Set(issues.map(i => i.code))],
    errorCount,
    warningCount,
    infoCount,
  };
}

function buildBatchResult(
  batchIssues: ValidationIssue[],
  readingResults: ReadingValidationResult[],
  batchId?: string,
  facilityId?: string,
): BatchValidationResult {
  const batchErrorCount = batchIssues.filter(i => i.severity === 'error').length;
  const batchWarningCount = batchIssues.filter(i => i.severity === 'warning').length;

  const readingErrorCount = readingResults.reduce((sum, r) => sum + r.errorCount, 0);
  const readingWarningCount = readingResults.reduce((sum, r) => sum + r.warningCount, 0);

  const validReadings = readingResults.filter(r => r.valid).length;
  const rejectedReadings = readingResults.filter(r => !r.valid).length;

  const allCodes = [
    ...batchIssues.map(i => i.code),
    ...readingResults.flatMap(r => r.qualityCodes),
  ];

  return {
    valid: batchErrorCount === 0 && rejectedReadings === 0,
    batchId,
    facilityId,
    totalReadings: readingResults.length,
    validReadings,
    rejectedReadings,
    batchIssues,
    readingResults,
    qualityCodes: [...new Set(allCodes)],
    errorCount: batchErrorCount + readingErrorCount,
    warningCount: batchWarningCount + readingWarningCount,
  };
}
