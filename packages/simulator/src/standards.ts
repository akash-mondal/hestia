export const DISCHARGE_LIMITS = {
  pH: { min: 5.5, max: 9.0 },
  BOD_mgL: 30,
  COD_mgL: 250,
  TSS_mgL: 100,
  temperature_C_above_ambient: 5,
  totalChromium_mgL: 2.0,
  hexChromium_mgL: 0.1,
  oilAndGrease_mgL: 10,
  ammoniacalN_mgL: 50,
} as const;

export enum IndustryCategory {
  PulpAndPaper = 'Pulp & Paper',
  Distillery = 'Distillery',
  Sugar = 'Sugar',
  Tanneries = 'Tanneries',
  ThermalPower = 'Thermal Power',
  Cement = 'Cement',
  OilRefineries = 'Oil Refineries',
  Fertilizer = 'Fertilizer',
  ChlorAlkali = 'Chlor-Alkali',
  DyeAndDyeIntermediates = 'Dye & Dye Intermediates',
  Pesticides = 'Pesticides',
  Pharma = 'Pharma',
  IronAndSteel = 'Iron & Steel',
  CopperSmelting = 'Copper Smelting',
  ZincSmelting = 'Zinc Smelting',
  Aluminium = 'Aluminium',
  Petrochemicals = 'Petrochemicals',
}

export type DischargeMode = 'discharge' | 'ZLD';

export interface CTOCustomLimits {
  BOD_mgL?: number;
  COD_mgL?: number;
  TSS_mgL?: number;
  totalChromium_mgL?: number;
  hexChromium_mgL?: number;
  oilAndGrease_mgL?: number;
  ammoniacalN_mgL?: number;
}
