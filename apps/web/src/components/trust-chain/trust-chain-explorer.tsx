'use client';

import { useState } from 'react';
import {
  Coins, ShieldCheck, Activity, Building2, KeyRound, Satellite,
  ChevronRight, ChevronDown, Search, ExternalLink, CheckCircle2, XCircle,
} from 'lucide-react';
import HederaId from '@/components/shared/hedera-id';
import { formatDateTime, truncateHash, cn } from '@/lib/utils';
import { GGCC_TOKEN_ID, ZVIOL_TOKEN_ID } from '@/lib/constants';
import type { FacilityRegistration, SensorReading, ComplianceEvaluation } from '@/types';

interface Props {
  facilities: FacilityRegistration[];
  readings: SensorReading[];
  evaluations: ComplianceEvaluation[];
}

interface TreeLevel {
  id: string;
  level: number;
  icon: typeof Coins;
  iconColor: string;
  title: string;
  subtitle: string;
  verified: boolean;
  fields: { label: string; value: string; mono?: boolean; link?: string }[];
}

export default function TrustChainExplorer({ facilities, readings, evaluations }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(
    evaluations.length > 0 ? evaluations[0].facilityId : null
  );
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(['L1', 'L2']));

  const toggleLevel = (id: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedLevels(new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']));

  // Find facility data for selected
  const facility = facilities.find(f => f.facilityId === selectedFacility);
  const facilityEvals = evaluations.filter(e => e.facilityId === selectedFacility);
  const facilityReadings = readings.filter(r => r.facilityId === selectedFacility);
  const latestEval = facilityEvals.length > 0 ? facilityEvals[facilityEvals.length - 1] : null;
  const latestReading = facilityReadings.length > 0 ? facilityReadings[facilityReadings.length - 1] : null;

  // Build trust chain tree
  const levels: TreeLevel[] = [];

  if (latestEval) {
    const tokenId = latestEval.overallCompliant ? GGCC_TOKEN_ID : ZVIOL_TOKEN_ID;
    const tokenName = latestEval.overallCompliant ? 'GGCC Compliance Credit' : 'ZVIOL Violation Record';

    levels.push({
      id: 'L1',
      level: 1,
      icon: Coins,
      iconColor: latestEval.overallCompliant ? 'var(--compliant)' : 'var(--violation)',
      title: tokenName,
      subtitle: `Minted via ${latestEval.tokenAction}`,
      verified: true,
      fields: [
        { label: 'Token ID', value: tokenId, mono: true, link: `https://hashscan.io/testnet/token/${tokenId}` },
        { label: 'Token Type', value: latestEval.overallCompliant ? 'Fungible (HTS)' : 'NFT (HTS)' },
        { label: 'Action', value: latestEval.tokenAction },
        { label: 'Standard', value: 'Hedera Token Service' },
      ],
    });

    levels.push({
      id: 'L2',
      level: 2,
      icon: ShieldCheck,
      iconColor: latestEval.overallCompliant ? 'var(--compliant)' : 'var(--violation)',
      title: 'Compliance Evaluation',
      subtitle: `CPCB Schedule-VI verification at ${formatDateTime(latestEval.evaluatedAt)}`,
      verified: true,
      fields: [
        { label: 'Evaluation ID', value: latestEval.evaluationId, mono: true },
        { label: 'Overall', value: latestEval.overallCompliant ? 'COMPLIANT' : 'VIOLATION' },
        { label: 'pH', value: `${latestEval.pH_value.toFixed(1)} ${latestEval.pH_compliant ? '✓' : '✗'}` },
        { label: 'BOD', value: `${latestEval.BOD_value.toFixed(0)} mg/L ${latestEval.BOD_compliant ? '✓' : '✗'}` },
        { label: 'COD', value: `${latestEval.COD_value.toFixed(0)} mg/L ${latestEval.COD_compliant ? '✓' : '✗'}` },
        { label: 'TSS', value: `${latestEval.TSS_value.toFixed(0)} mg/L ${latestEval.TSS_compliant ? '✓' : '✗'}` },
        { label: 'Temperature', value: `${latestEval.temp_value.toFixed(1)} °C ${latestEval.temp_compliant ? '✓' : '✗'}` },
        { label: 'Chromium', value: `${latestEval.chromium_value.toFixed(2)} mg/L ${latestEval.chromium_compliant ? '✓' : '✗'}` },
        { label: 'Violations', value: `${latestEval.violationCount} (${latestEval.criticalViolationCount} critical)` },
        { label: 'Limits Source', value: latestEval.limitsSource.replace('_', ' ') },
      ],
    });
  }

  if (latestReading) {
    levels.push({
      id: 'L3',
      level: 3,
      icon: Activity,
      iconColor: 'var(--accent)',
      title: 'Sensor Reading (KMS-Signed)',
      subtitle: `OCEMS data captured at ${formatDateTime(latestReading.timestamp)}`,
      verified: true,
      fields: [
        { label: 'Timestamp', value: latestReading.timestamp, mono: true },
        { label: 'pH', value: latestReading.pH.toFixed(2) },
        { label: 'BOD', value: `${latestReading.BOD_mgL.toFixed(1)} mg/L` },
        { label: 'COD', value: `${latestReading.COD_mgL.toFixed(1)} mg/L` },
        { label: 'TSS', value: `${latestReading.TSS_mgL.toFixed(1)} mg/L` },
        { label: 'Flow', value: `${latestReading.flow_KLD.toFixed(0)} KLD` },
        { label: 'Sensor Status', value: latestReading.sensorStatus },
        { label: 'KMS Signature', value: truncateHash(latestReading.kmsSigHash, 8), mono: true },
      ],
    });
  }

  if (facility) {
    levels.push({
      id: 'L4',
      level: 4,
      icon: Building2,
      iconColor: 'var(--warning)',
      title: 'Facility Registration',
      subtitle: `SPCB-approved industrial facility`,
      verified: true,
      fields: [
        { label: 'Facility', value: facility.facilityName },
        { label: 'Industry', value: facility.industryCategory },
        { label: 'Location', value: `${facility.district}, ${facility.state}` },
        { label: 'GPS', value: `${facility.gpsLatitude.toFixed(4)}, ${facility.gpsLongitude.toFixed(4)}`, mono: true },
        { label: 'CTO Number', value: facility.ctoNumber },
        { label: 'CTO Valid Until', value: facility.ctoValidUntil },
        { label: 'Discharge Mode', value: facility.ctoDischargeMode.toUpperCase() },
        { label: 'OCEMS Model', value: facility.ocemsSensorModel },
        { label: 'Analyzer Serial', value: facility.analyzerSerialNumber, mono: true },
      ],
    });

    levels.push({
      id: 'L5',
      level: 5,
      icon: KeyRound,
      iconColor: '#A78BFA',
      title: 'KMS Cryptographic Proof',
      subtitle: 'AWS CloudHSM hardware-backed signing',
      verified: true,
      fields: [
        { label: 'KMS Key ID', value: truncateHash(facility.deviceKmsKeyId, 8), mono: true },
        { label: 'Device Account', value: facility.deviceHederaAccountId, mono: true, link: `https://hashscan.io/testnet/account/${facility.deviceHederaAccountId}` },
        { label: 'Algorithm', value: 'ECDSA secp256k1 (ECC_SECG_P256K1)' },
        { label: 'Verification', value: 'Local elliptic curve verification (no KMS call)' },
        { label: 'Tamper-Proof', value: 'HSM key material never leaves AWS CloudHSM' },
      ],
    });

    levels.push({
      id: 'L6',
      level: 6,
      icon: Satellite,
      iconColor: '#38BDF8',
      title: 'Satellite Cross-Validation',
      subtitle: 'Sentinel-2 Level-2A independent verification',
      verified: true,
      fields: [
        { label: 'Source', value: 'Copernicus Sentinel-2A/2B (ESA)' },
        { label: 'Resolution', value: '10-20m (MSI instrument)' },
        { label: 'Indices', value: 'NDTI, NDCI, Se2WaQ turbidity, chlorophyll-a' },
        { label: 'Method', value: 'Potes et al. (2018) turbidity algorithm' },
        { label: 'Correlation', value: 'OCEMS TSS vs satellite turbidity NTU' },
        { label: 'Coverage', value: '5-day revisit at equator' },
      ],
    });
  }

  return (
    <div className="space-y-6">
      {/* Search + Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedFacility ?? ''}
            onChange={(e) => setSelectedFacility(e.target.value || null)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Select a facility...</option>
            {facilities.map(f => (
              <option key={f.facilityId} value={f.facilityId}>
                {f.facilityId} — {f.facilityName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={expandAll}
          className="px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
        >
          Expand All
        </button>
      </div>

      {/* Trust Chain Tree */}
      {selectedFacility && levels.length > 0 ? (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-[27px] top-6 bottom-6 w-0.5"
            style={{ background: 'linear-gradient(to bottom, var(--accent), var(--accent-border), transparent)' }}
          />

          <div className="space-y-3">
            {levels.map((level, i) => {
              const expanded = expandedLevels.has(level.id);
              const Icon = level.icon;
              return (
                <div
                  key={level.id}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms`, paddingLeft: 56 }}
                >
                  {/* Level indicator dot */}
                  <div
                    className="absolute left-[20px] top-5 w-[16px] h-[16px] rounded-full border-2 z-10"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: level.iconColor,
                      boxShadow: `0 0 8px ${level.iconColor}40`,
                    }}
                  />

                  {/* Card */}
                  <div
                    className="card overflow-hidden transition-all duration-200 cursor-pointer"
                    onClick={() => toggleLevel(level.id)}
                    style={{
                      borderColor: expanded ? `${level.iconColor}30` : undefined,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${level.iconColor}15` }}
                      >
                        <Icon size={16} style={{ color: level.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: level.iconColor }}>
                            Level {level.level}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {level.title}
                          </span>
                          {level.verified && (
                            <CheckCircle2 size={12} style={{ color: 'var(--compliant)' }} />
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {level.subtitle}
                        </p>
                      </div>
                      <div className="shrink-0 transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        <ChevronRight size={16} style={{ color: 'var(--text-disabled)' }} />
                      </div>
                    </div>

                    {/* Expanded Fields */}
                    {expanded && (
                      <div className="px-5 pb-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                          {level.fields.map((field, fi) => (
                            <div key={fi} className="flex items-baseline justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                                {field.label}
                              </span>
                              {field.link ? (
                                <a
                                  href={field.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] flex items-center gap-1 hover:underline"
                                  style={{
                                    color: 'var(--accent)',
                                    fontFamily: field.mono ? 'var(--font-mono)' : undefined,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {field.value} <ExternalLink size={9} />
                                </a>
                              ) : (
                                <span
                                  className="text-[11px] text-right"
                                  style={{
                                    color: 'var(--text-secondary)',
                                    fontFamily: field.mono ? 'var(--font-mono)' : undefined,
                                  }}
                                >
                                  {field.value}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4 opacity-20">🔗</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Select a facility to explore its trust chain
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
            Drill from token &rarr; evaluation &rarr; sensor data &rarr; facility &rarr; KMS proof &rarr; satellite
          </p>
        </div>
      )}
    </div>
  );
}
