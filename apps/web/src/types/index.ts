// Dashboard-specific types derived from Guardian VC schema fields

export interface FacilityRegistration {
  facilityId: string;
  facilityName: string;
  industryCategory: string;
  state: string;
  district: string;
  gpsLatitude: number;
  gpsLongitude: number;
  ocemsSensorModel: string;
  analyzerSerialNumber: string;
  ctoNumber: string;
  ctoValidUntil: string;
  ctoDischargeMode: 'discharge' | 'ZLD';
  ctoBODLimit: number | null;
  ctoCODLimit: number | null;
  ctoTSSLimit: number | null;
  deviceKmsKeyId: string;
  deviceHederaAccountId: string;
}

export interface SensorReading {
  timestamp: string;
  facilityId: string;
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
  sensorStatus: string;
  kmsKeyId: string;
  kmsSigHash: string;
}

export interface ComplianceEvaluation {
  evaluationId: string;
  facilityId: string;
  evaluatedAt: string;
  limitsSource: string;
  isZLD: boolean;
  pH_compliant: boolean;
  pH_value: number;
  BOD_compliant: boolean;
  BOD_value: number;
  COD_compliant: boolean;
  COD_value: number;
  TSS_compliant: boolean;
  TSS_value: number;
  temp_compliant: boolean;
  temp_value: number;
  chromium_compliant: boolean;
  chromium_value: number;
  overallCompliant: boolean;
  violationCount: number;
  criticalViolationCount: number;
  tokenAction: 'mint_ggcc' | 'mint_violation_nft' | 'pending_review';
}

export interface TrustChainLevel {
  level: number;
  label: string;
  icon: string;
  data: Record<string, string | number | boolean>;
  hashScanLink?: string;
  verified: boolean;
}

export interface DashboardStats {
  facilityCount: number;
  readingCount: number;
  complianceRate: number;
  tokensMinted: number;
  violationNFTs: number;
}

export interface ActivityEvent {
  id: string;
  type: 'reading' | 'compliance' | 'mint_ggcc' | 'mint_violation' | 'registration' | 'approval';
  facilityId: string;
  timestamp: string;
  summary: string;
  details?: Record<string, string | number | boolean>;
}
