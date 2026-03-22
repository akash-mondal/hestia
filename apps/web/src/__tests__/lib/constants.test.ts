import { describe, it, expect } from 'vitest';
import { DISCHARGE_LIMITS, PARAMETER_LABELS, GGCC_TOKEN_ID, ZVIOL_TOKEN_ID, HASHSCAN_BASE } from '@/lib/constants';

describe('DISCHARGE_LIMITS', () => {
  it('has 9 parameters', () => {
    expect(Object.keys(DISCHARGE_LIMITS)).toHaveLength(9);
  });

  it('pH has both min and max', () => {
    const pH = DISCHARGE_LIMITS.pH;
    expect(pH).toHaveProperty('min');
    expect(pH).toHaveProperty('max');
    expect(pH.min).toBe(5.5);
    expect(pH.max).toBe(9.0);
  });

  it('non-pH parameters have max only', () => {
    const params = ['BOD_mgL', 'COD_mgL', 'TSS_mgL', 'temperature_C', 'totalChromium_mgL', 'hexChromium_mgL', 'oilAndGrease_mgL', 'ammoniacalN_mgL'] as const;
    for (const p of params) {
      expect(DISCHARGE_LIMITS[p]).toHaveProperty('max');
      expect(DISCHARGE_LIMITS[p]).not.toHaveProperty('min');
    }
  });

  it('all parameters have string unit', () => {
    for (const key of Object.keys(DISCHARGE_LIMITS) as (keyof typeof DISCHARGE_LIMITS)[]) {
      expect(typeof DISCHARGE_LIMITS[key].unit).toBe('string');
    }
  });
});

describe('PARAMETER_LABELS', () => {
  it('covers all 11 parameters', () => {
    expect(Object.keys(PARAMETER_LABELS)).toHaveLength(11);
  });

  it('includes key labels', () => {
    expect(PARAMETER_LABELS.pH).toBe('pH');
    expect(PARAMETER_LABELS.BOD_mgL).toBe('BOD');
    expect(PARAMETER_LABELS.hexChromium_mgL).toBe('Hex. Cr(VI)');
    expect(PARAMETER_LABELS.ammoniacalN_mgL).toBe('NH₃-N');
  });
});

describe('Token IDs', () => {
  it('GGCC token matches Hedera format', () => {
    expect(GGCC_TOKEN_ID).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it('ZVIOL token matches Hedera format', () => {
    expect(ZVIOL_TOKEN_ID).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('HASHSCAN_BASE', () => {
  it('points to testnet', () => {
    expect(HASHSCAN_BASE).toBe('https://hashscan.io/testnet');
  });
});
