// Guardian
export const GUARDIAN_URL = process.env.GUARDIAN_URL || 'http://165.22.212.120:3000/api/v1';
export const GUARDIAN_USERNAME = process.env.GUARDIAN_USERNAME || 'akash';
export const GUARDIAN_PASSWORD = process.env.GUARDIAN_PASSWORD || 'Akash@17327';
export const POLICY_ID = process.env.GUARDIAN_POLICY_ID || '69bbb6b2b17ff3040769aaa8';

// Hedera
export const MIRROR_NODE_URL = process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com/api/v1';
export const GGCC_TOKEN_ID = '0.0.8182260';
export const ZVIOL_TOKEN_ID = '0.0.8182266';
export const COMPLIANCE_CHECKER_ADDRESS = '0x029CD3A532EF5B28702c46B92Cb832Cb87917253';
export const PENALTY_CALCULATOR_ADDRESS = '0x8633F178dE49311BE32E3DF2787f3641Ed5a9F75';

// Satellite
export const SATELLITE_API_URL = process.env.SATELLITE_API_URL || 'http://localhost:8000';

// CPCB Schedule-VI Discharge Limits
export const DISCHARGE_LIMITS = {
  pH: { min: 5.5, max: 9.0, unit: '' },
  BOD_mgL: { max: 30, unit: 'mg/L' },
  COD_mgL: { max: 250, unit: 'mg/L' },
  TSS_mgL: { max: 100, unit: 'mg/L' },
  temperature_C: { max: 40, unit: '°C' },
  totalChromium_mgL: { max: 2.0, unit: 'mg/L' },
  hexChromium_mgL: { max: 0.1, unit: 'mg/L' },
  oilAndGrease_mgL: { max: 10, unit: 'mg/L' },
  ammoniacalN_mgL: { max: 50, unit: 'mg/L' },
} as const;

// Parameter display names (regulatory language)
export const PARAMETER_LABELS: Record<string, string> = {
  pH: 'pH',
  BOD_mgL: 'BOD',
  COD_mgL: 'COD',
  TSS_mgL: 'TSS',
  temperature_C: 'Temperature',
  totalChromium_mgL: 'Total Cr',
  hexChromium_mgL: 'Hex. Cr(VI)',
  oilAndGrease_mgL: 'Oil & Grease',
  ammoniacalN_mgL: 'NH₃-N',
  dissolvedOxygen_mgL: 'DO',
  flow_KLD: 'Flow',
};

// HashScan base URL
export const HASHSCAN_BASE = 'https://hashscan.io/testnet';
