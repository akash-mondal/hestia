import type { FacilityRegistration, SensorReading, ComplianceEvaluation, DashboardStats, ActivityEvent } from '@/types';

export function createFacility(overrides: Partial<FacilityRegistration> = {}): FacilityRegistration {
  return {
    facilityId: 'GPI-UP-001',
    facilityName: 'Kanpur Tannery Cluster A',
    industryCategory: 'Tannery',
    state: 'Uttar Pradesh',
    district: 'Kanpur',
    gpsLatitude: 26.45,
    gpsLongitude: 80.33,
    ocemsSensorModel: 'ABB AO2000',
    analyzerSerialNumber: 'ABB-2024-001',
    ctoNumber: 'CTO-UP-2024-001',
    ctoValidUntil: '2026-12-31',
    ctoDischargeMode: 'discharge',
    ctoBODLimit: 30,
    ctoCODLimit: 250,
    ctoTSSLimit: 100,
    deviceKmsKeyId: '907fbc7e-3555-46e9-a8b0-dbdf9b84d35b',
    deviceHederaAccountId: '0.0.8148249',
    ...overrides,
  };
}

export function createReading(overrides: Partial<SensorReading> = {}): SensorReading {
  return {
    timestamp: '2026-03-19T10:30:00Z',
    facilityId: 'GPI-UP-001',
    pH: 7.2,
    BOD_mgL: 22,
    COD_mgL: 180,
    TSS_mgL: 65,
    temperature_C: 28,
    totalChromium_mgL: 0.8,
    hexChromium_mgL: 0.05,
    oilAndGrease_mgL: 5,
    ammoniacalN_mgL: 12,
    dissolvedOxygen_mgL: 6.5,
    flow_KLD: 450,
    sensorStatus: 'online',
    kmsKeyId: '907fbc7e-3555-46e9-a8b0-dbdf9b84d35b',
    kmsSigHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    ...overrides,
  };
}

export function createEvaluation(overrides: Partial<ComplianceEvaluation> = {}): ComplianceEvaluation {
  return {
    evaluationId: 'eval-001-20260319-103000',
    facilityId: 'GPI-UP-001',
    evaluatedAt: '2026-03-19T10:30:00Z',
    limitsSource: 'schedule_vi',
    isZLD: false,
    pH_compliant: true,
    pH_value: 7.2,
    BOD_compliant: true,
    BOD_value: 22,
    COD_compliant: true,
    COD_value: 180,
    TSS_compliant: true,
    TSS_value: 65,
    temp_compliant: true,
    temp_value: 28,
    chromium_compliant: true,
    chromium_value: 0.8,
    overallCompliant: true,
    violationCount: 0,
    criticalViolationCount: 0,
    tokenAction: 'mint_ggcc',
    ...overrides,
  };
}

export function createViolatingReading(overrides: Partial<SensorReading> = {}): SensorReading {
  return createReading({
    BOD_mgL: 45,
    COD_mgL: 380,
    totalChromium_mgL: 3.5,
    ...overrides,
  });
}

export function createViolatingEvaluation(overrides: Partial<ComplianceEvaluation> = {}): ComplianceEvaluation {
  return createEvaluation({
    BOD_compliant: false,
    BOD_value: 45,
    COD_compliant: false,
    COD_value: 380,
    chromium_compliant: false,
    chromium_value: 3.5,
    overallCompliant: false,
    violationCount: 3,
    criticalViolationCount: 1,
    tokenAction: 'mint_violation_nft',
    ...overrides,
  });
}

export function createMultipleFacilities(n: number): FacilityRegistration[] {
  return Array.from({ length: n }, (_, i) =>
    createFacility({
      facilityId: `GPI-UP-${String(i + 1).padStart(3, '0')}`,
      facilityName: `Facility ${i + 1}`,
      gpsLatitude: 26.45 + i * 0.01,
      gpsLongitude: 80.33 + i * 0.01,
    })
  );
}

export function createStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    facilityCount: 5,
    readingCount: 25,
    complianceRate: 80,
    tokensMinted: 20,
    violationNFTs: 5,
    ...overrides,
  };
}
