// Standards & profiles
export {
  DISCHARGE_LIMITS,
  IndustryCategory,
  INDUSTRY_PROFILES,
  AMBIENT_TEMP_BASELINE,
  AMBIENT_TEMP_AMPLITUDE,
  PH_DIURNAL_AMPLITUDE,
} from './standards';
export type {
  DischargeMode,
  CTOCustomLimits,
  ParameterRange,
  IndustryProfile,
  GenerationScenario,
} from './standards';

// Facilities
export { FACILITIES } from './facilities';
export type { FacilityConfig } from './facilities';

// Generators
export {
  generateSensorReading,
  generateBatch,
  generateTimeSeries,
} from './generators';
export type {
  SensorReading,
  SensorReadingBatch,
  GenerationOptions,
} from './generators';
