import type { SensorReading } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSensorReading(reading: unknown): ValidationResult {
  const errors: string[] = [];

  if (!reading || typeof reading !== 'object') {
    return { valid: false, errors: ['Reading must be a non-null object'] };
  }

  const r = reading as Record<string, unknown>;

  // Required fields
  const requiredFields = [
    'timestamp', 'facilityId', 'facilityDID', 'pH', 'BOD_mgL', 'COD_mgL',
    'TSS_mgL', 'temperature_C', 'totalChromium_mgL', 'hexChromium_mgL',
    'oilAndGrease_mgL', 'ammoniacalN_mgL', 'dissolvedOxygen_mgL',
    'flow_KLD', 'sensorStatus', 'kmsKeyId', 'kmsSigHash',
  ];

  for (const field of requiredFields) {
    if (r[field] === undefined || r[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Type checks for numeric fields
  const numericFields = [
    'pH', 'BOD_mgL', 'COD_mgL', 'TSS_mgL', 'temperature_C',
    'totalChromium_mgL', 'hexChromium_mgL', 'oilAndGrease_mgL',
    'ammoniacalN_mgL', 'dissolvedOxygen_mgL', 'flow_KLD',
  ];

  for (const field of numericFields) {
    if (typeof r[field] !== 'number' || isNaN(r[field] as number)) {
      errors.push(`${field} must be a valid number`);
    }
  }

  // Range checks — physically impossible values
  const sr = r as unknown as SensorReading;

  if (typeof sr.pH === 'number') {
    if (sr.pH < 0 || sr.pH > 14) errors.push(`pH out of range: ${sr.pH} (must be 0-14)`);
  }

  if (typeof sr.temperature_C === 'number') {
    if (sr.temperature_C > 100) errors.push(`Temperature too high: ${sr.temperature_C}°C`);
    if (sr.temperature_C < -10) errors.push(`Temperature too low: ${sr.temperature_C}°C`);
  }

  // No negative concentrations
  for (const field of ['BOD_mgL', 'COD_mgL', 'TSS_mgL', 'totalChromium_mgL', 'hexChromium_mgL', 'oilAndGrease_mgL', 'ammoniacalN_mgL', 'dissolvedOxygen_mgL', 'flow_KLD']) {
    const val = sr[field as keyof SensorReading];
    if (typeof val === 'number' && val < 0) {
      errors.push(`${field} cannot be negative: ${val}`);
    }
  }

  // Chemistry constraint: COD must be greater than BOD
  if (typeof sr.COD_mgL === 'number' && typeof sr.BOD_mgL === 'number') {
    if (sr.COD_mgL <= sr.BOD_mgL) {
      errors.push(`COD (${sr.COD_mgL}) must be greater than BOD (${sr.BOD_mgL}) — fundamental chemistry constraint`);
    }
  }

  // Timestamp sanity
  if (typeof sr.timestamp === 'string') {
    const ts = new Date(sr.timestamp).getTime();
    const now = Date.now();

    if (isNaN(ts)) {
      errors.push('Invalid timestamp format');
    } else if (ts > now + 60_000) {
      errors.push('Timestamp is in the future');
    } else if (ts < now - 86_400_000) {
      errors.push('Timestamp is more than 24 hours old');
    }
  }

  // Sensor status enum
  const validStatuses = ['online', 'offline_queued', 'reconnected_batch', 'maintenance', 'calibrating'];
  if (!validStatuses.includes(sr.sensorStatus as string)) {
    errors.push(`Invalid sensorStatus: ${sr.sensorStatus}`);
  }

  // KMS signature hash presence
  if (typeof sr.kmsSigHash === 'string' && sr.kmsSigHash.length === 0) {
    errors.push('kmsSigHash cannot be empty');
  }

  return { valid: errors.length === 0, errors };
}
