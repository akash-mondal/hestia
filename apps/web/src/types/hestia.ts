import type { LucideIcon } from 'lucide-react';

// ── Guardian Schema Types (field0-fieldN mapped to named properties) ──

export interface SiteRegistration {
  siteId: string;            // field0
  siteName: string;          // field1
  ownerEntity: string;       // field2
  state: string;             // field3
  county: string;            // field4
  gpsLatitude: number;       // field5
  gpsLongitude: number;      // field6
  totalAcres: number;        // field7
  wuiStructures: number;     // field8
  vegetationType: string;    // field9
  currentFireRiskScore: number; // field10
  insurerName: string;       // field11
  annualPremium: number;     // field12
  hederaAccountId: string;   // field13
}

export interface TreatmentPlan {
  planId: string;            // field0
  siteId: string;            // field1
  treatmentType: string;     // field2
  plannedAcres: number;      // field3
  plannedStartDate: string;  // field4
  plannedEndDate: string;    // field5
  fuelLoadPreTreatment: number; // field6
  crewCertification: string; // field7
  burnPermitNumber: string;  // field8
  environmentalClearance: boolean; // field9
}

export interface TreatmentReport {
  reportId: string;          // field0
  planId: string;            // field1
  siteId: string;            // field2
  actualStartDate: string;   // field3
  actualEndDate: string;     // field4
  treatedAcres: number;      // field5
  fuelLoadPostTreatment: number; // field6
  fuelReductionPercent: number;  // field7
  containmentVerified: boolean;  // field8
  groundTempReadings: string;    // field9
  photoDocHash: string;          // field10
  crewLeadName: string;          // field11
}

export interface RiskAssessment {
  assessmentId: string;      // field0
  siteId: string;            // field1
  assessedAt: string;        // field2
  preFireRiskScore: number;  // field3
  postFireRiskScore: number; // field4
  riskReductionPercent: number; // field5
  ndviPreTreatment: number;  // field6
  ndviPostTreatment: number; // field7
  nbrDelta: number;          // field8
  firmsHotspotCount: number; // field9
  weatherRiskFactor: number; // field10
  slopeRiskFactor: number;   // field11
  wuiDensityFactor: number;  // field12
  verifiedAcres: number;     // field13 — WRC MINT AMOUNT
  dataSourcesUsed: string;   // field14
  sentinelTileDate: string;  // field15
  overallCompliant: boolean; // field16
  tokenAction: string;       // field17
}

export interface InsuranceImpact {
  impactId: string;          // field0
  siteId: string;            // field1
  assessedAt: string;        // field2
  preRiskScore: number;      // field3
  postRiskScore: number;     // field4
  premiumReductionPercent: number; // field5
  estimatedAnnualSavings: number;  // field6
  parametricTriggerThreshold: number; // field7
  parametricMaxPayout: number;    // field8
  seeaStockClassification: string; // field9
  seeaFlowType: string;       // field10
  seeaMonetaryValue: number;  // field11
}

export interface SatelliteValidation {
  validationId: string;      // field0
  siteId: string;            // field1
  sentinelTileDate: string;  // field2
  ndviValue: number;         // field3
  nbrValue: number;          // field4
  firmsDetections: number;   // field5
  landcoverClass: string;    // field6
  correlationScore: number;  // field7
}

// ── UI Types ──

export interface HestiaStatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  glow: 'green' | 'amber' | 'teal' | 'red' | 'orange';
  link?: string;
  subtitle?: string;
}

export interface FireDetection {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string;
  frp: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
}

export type HestiaRole = 'land-manager' | 'operator' | 'verifier' | 'satellite';

export interface HestiaActivityEvent {
  id: string;
  type: 'site_registered' | 'plan_submitted' | 'treatment_complete' | 'risk_assessed' | 'wrc_minted' | 'fire_detected';
  siteId: string;
  timestamp: string;
  summary: string;
  hashScanLink?: string;
}

// ── Field mapping helpers ──

export const SITE_FIELDS = ['siteId', 'siteName', 'ownerEntity', 'state', 'county', 'gpsLatitude', 'gpsLongitude', 'totalAcres', 'wuiStructures', 'vegetationType', 'currentFireRiskScore', 'insurerName', 'annualPremium', 'hederaAccountId'] as const;
export const PLAN_FIELDS = ['planId', 'siteId', 'treatmentType', 'plannedAcres', 'plannedStartDate', 'plannedEndDate', 'fuelLoadPreTreatment', 'crewCertification', 'burnPermitNumber', 'environmentalClearance'] as const;
export const REPORT_FIELDS = ['reportId', 'planId', 'siteId', 'actualStartDate', 'actualEndDate', 'treatedAcres', 'fuelLoadPostTreatment', 'fuelReductionPercent', 'containmentVerified', 'groundTempReadings', 'photoDocHash', 'crewLeadName'] as const;
export const RISK_FIELDS = ['assessmentId', 'siteId', 'assessedAt', 'preFireRiskScore', 'postFireRiskScore', 'riskReductionPercent', 'ndviPreTreatment', 'ndviPostTreatment', 'nbrDelta', 'firmsHotspotCount', 'weatherRiskFactor', 'slopeRiskFactor', 'wuiDensityFactor', 'verifiedAcres', 'dataSourcesUsed', 'sentinelTileDate', 'overallCompliant', 'tokenAction'] as const;
export const INSURANCE_FIELDS = ['impactId', 'siteId', 'assessedAt', 'preRiskScore', 'postRiskScore', 'premiumReductionPercent', 'estimatedAnnualSavings', 'parametricTriggerThreshold', 'parametricMaxPayout', 'seeaStockClassification', 'seeaFlowType', 'seeaMonetaryValue'] as const;
export const VALIDATION_FIELDS = ['validationId', 'siteId', 'sentinelTileDate', 'ndviValue', 'nbrValue', 'firmsDetections', 'landcoverClass', 'correlationScore'] as const;
