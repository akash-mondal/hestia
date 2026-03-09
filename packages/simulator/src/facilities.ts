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
    violationProbability: 0.5, // 50% COD violations (mean 350 vs limit 250)
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
    // Stricter CTO: near drinking water intake
    ctoCustomLimits: { BOD_mgL: 20, COD_mgL: 150, totalChromium_mgL: 1.0 },
    violationProbability: 0.6,
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
  {
    id: 'KNP-DST-001',
    name: 'UP Distillers Ltd, Unnao',
    category: IndustryCategory.Distillery,
    state: 'Uttar Pradesh',
    district: 'Unnao',
    lat: 26.5300,
    lon: 80.4880,
    ctoNumber: 'UPPCB/CTO/2024/DST/001',
    ctoDischargeMode: 'ZLD', // Zero Liquid Discharge mandated
    ctoCustomLimits: null,
    violationProbability: 0.2, // occasional discharge = violation
  },
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
    violationProbability: 0.15, // mostly compliant
  },
];
