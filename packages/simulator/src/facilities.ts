import { IndustryCategory, type DischargeMode, type CTOCustomLimits } from './standards';

export interface FacilityConfig {
  id: string;
  name: string;
  category: IndustryCategory;
  state: string;
  district: string;
  lat: number;
  lon: number;
  ctoNumber: string;
  ctoDischargeMode: DischargeMode;
  ctoCustomLimits: CTOCustomLimits | null;
  violationProbability: number; // 0-1, chance of generating a violating reading
}

export const FACILITIES: FacilityConfig[] = [
  // --- KANPUR JAJMAU TANNERY CLUSTER (5 facilities) ---
  // Jajmau has ~400 tanneries, most connected to the 9 MLD CETP (operating >12 MLD)
  // NGT ordered ₹2.37 crore penalty on 211 tanneries in 2024
  {
    id: 'KNP-TAN-001',
    name: 'Superhouse Leather Ltd, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4499,
    lon: 80.3919,
    ctoNumber: 'UPPCB/CTO/2024/TAN/001',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.5, // 50% — chronic COD/Cr violator
  },
  {
    id: 'KNP-TAN-002',
    name: 'Mirza Tanners Pvt Ltd, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4485,
    lon: 80.3905,
    ctoNumber: 'UPPCB/CTO/2024/TAN/002',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.3,
  },
  {
    id: 'KNP-TAN-003',
    name: 'Rahman Industries, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4510,
    lon: 80.3880,
    ctoNumber: 'UPPCB/CTO/2024/TAN/003',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.4,
  },
  {
    id: 'KNP-TAN-004',
    name: 'Pioneer Tannery, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4520,
    lon: 80.3850,
    ctoNumber: 'UPPCB/CTO/2024/TAN/004',
    ctoDischargeMode: 'discharge',
    // Stricter CTO: near Ganga drinking water intake at Gau Ghat
    ctoCustomLimits: { BOD_mgL: 20, COD_mgL: 150, totalChromium_mgL: 1.0 },
    violationProbability: 0.6, // Stricter limits → more violations
  },
  {
    id: 'KNP-TAN-005',
    name: 'Kanpur Chrome Tanning Co, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4475,
    lon: 80.3935,
    ctoNumber: 'UPPCB/CTO/2024/TAN/005',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.35,
  },

  // --- ZLD MANDATED DISTILLERY ---
  // All distilleries mandated ZLD by CPCB since 2014
  // Any liquid discharge = violation regardless of parameter quality
  {
    id: 'KNP-DST-001',
    name: 'UP Distillers Ltd, Unnao',
    category: IndustryCategory.Distillery,
    state: 'Uttar Pradesh',
    district: 'Unnao',
    lat: 26.5300,
    lon: 80.4880,
    ctoNumber: 'UPPCB/CTO/2024/DST/001',
    ctoDischargeMode: 'ZLD',
    ctoCustomLimits: null,
    violationProbability: 0.2, // 20% chance of discharge (ZLD breach)
  },

  // --- PHARMACEUTICAL ETP ---
  // 774 pharma units nationally, API wash waters cause periodic COD spikes
  {
    id: 'KNP-PHA-001',
    name: 'Omega Pharma Industries, Kanpur',
    category: IndustryCategory.Pharma,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4700,
    lon: 80.3500,
    ctoNumber: 'UPPCB/CTO/2025/PHA/001',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.25,
  },

  // --- PULP & PAPER MILL ---
  // High water consumption (500-5000 KLD), black liquor is primary pollutant
  {
    id: 'UNN-PPR-001',
    name: 'Ganges Paper Mills, Unnao',
    category: IndustryCategory.PulpAndPaper,
    state: 'Uttar Pradesh',
    district: 'Unnao',
    lat: 26.5500,
    lon: 80.5100,
    ctoNumber: 'UPPCB/CTO/2024/PPR/001',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.3,
  },

  // --- DYE & DYE INTERMEDIATES ---
  // Chrome dyes cause Cr discharge, recalcitrant organics resist biodegradation
  {
    id: 'KNP-DYE-001',
    name: 'Ganga Dyes & Chemicals, Kanpur',
    category: IndustryCategory.DyeAndDyeIntermediates,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4600,
    lon: 80.3700,
    ctoNumber: 'UPPCB/CTO/2025/DYE/001',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.35,
  },

  // --- MOSTLY COMPLIANT TANNERY (for contrast in demo) ---
  {
    id: 'KNP-TAN-006',
    name: 'Bharat Leather Works, Jajmau',
    category: IndustryCategory.Tanneries,
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    lat: 26.4505,
    lon: 80.3870,
    ctoNumber: 'UPPCB/CTO/2024/TAN/006',
    ctoDischargeMode: 'discharge',
    ctoCustomLimits: null,
    violationProbability: 0.1, // Well-maintained ETP — mostly compliant
  },
];
