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

export interface MirrorNodeMessage {
  consensus_timestamp: string;
  message: string;
  payer_account_id: string;
  running_hash: string;
  sequence_number: number;
  topic_id: string;
}

export interface MirrorNodeResponse<T> {
  [key: string]: T[] | { next: string | null } | undefined;
  links?: { next: string | null };
}

export interface TokenBalance {
  token_id: string;
  balance: number;
  decimals: number;
}

export interface NFTInfo {
  account_id: string;
  created_timestamp: string;
  metadata: string;
  serial_number: number;
  token_id: string;
}
