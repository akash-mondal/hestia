import type { FacilityConfig } from './facilities';
import { IndustryCategory } from './standards';

export interface SensorReading {
  timestamp: string;
  facilityId: string;
  facilityDID: string;
  pH: number;
  BOD_mgL: number;
  COD_mgL: number;
  TSS_mgL: number;
  temperature_C: number;
  totalChromium_mgL: number;
  hexChromium_mgL: number;
  oilAndGrease_mgL: number;
  ammoniacalN_mgL: number;
  dissolvedOxygen_mgL: number;
  flow_KLD: number;
  sensorStatus: 'online' | 'offline_queued' | 'reconnected_batch' | 'maintenance' | 'calibrating';
  kmsKeyId: string;
  kmsSigHash: string;
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export function generateSensorReading(
  facility: FacilityConfig,
  opts?: { forceViolation?: boolean; kmsKeyId?: string }
): SensorReading {
  const isViolation = opts?.forceViolation ?? Math.random() < facility.violationProbability;
  const isZLD = facility.ctoDischargeMode === 'ZLD';
  const isTannery = facility.category === IndustryCategory.Tanneries;

  // Generate BOD first, then ensure COD > BOD
  const bod = isViolation ? rand(25, 50) : rand(5, 25);
  const codMin = bod + 10; // COD must always be > BOD
  const cod = isViolation ? rand(Math.max(250, codMin), 400) : rand(codMin, 200);

  const reading: SensorReading = {
    timestamp: new Date().toISOString(),
    facilityId: facility.id,
    facilityDID: `did:hedera:testnet:${facility.id}`,
    pH: rand(6.5, 8.5),
    BOD_mgL: bod,
    COD_mgL: cod,
    TSS_mgL: isViolation ? rand(80, 150) : rand(20, 80),
    temperature_C: rand(25, 38),
    totalChromium_mgL: isTannery ? (isViolation ? rand(1.5, 3.5) : rand(0.1, 1.5)) : rand(0, 0.1),
    hexChromium_mgL: isTannery ? (isViolation ? rand(0.08, 0.2) : rand(0.01, 0.08)) : rand(0, 0.01),
    oilAndGrease_mgL: rand(2, 8),
    ammoniacalN_mgL: rand(5, 35),
    dissolvedOxygen_mgL: rand(2, 8),
    flow_KLD: isZLD && !isViolation ? 0 : rand(50, 500), // ZLD compliant = zero discharge
    sensorStatus: 'online',
    kmsKeyId: opts?.kmsKeyId || `alias/hedera-signing-key-${facility.id}`,
    kmsSigHash: '', // populated after KMS signing
  };

  return reading;
}
