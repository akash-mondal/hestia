'use client';

import { useState } from 'react';
import { ArrowLeft, MapPin, Shield, Cpu, KeyRound, Activity, ShieldCheck, Coins } from 'lucide-react';
import Link from 'next/link';
import StatusPill from '@/components/shared/status-pill';
import HederaId from '@/components/shared/hedera-id';
import ParameterBar from '@/components/shared/parameter-bar';
import ReadingsChart from './readings-chart';
import ComplianceHistory from './compliance-history';
import type { FacilityRegistration, SensorReading, ComplianceEvaluation } from '@/types';

interface Props {
  facilityId: string;
  facility: FacilityRegistration | null;
  readings: SensorReading[];
  evaluations: ComplianceEvaluation[];
}

const TABS = [
  { id: 'readings', label: 'Sensor Readings', icon: Activity },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'tokens', label: 'Tokens', icon: Coins },
] as const;

type TabId = typeof TABS[number]['id'];

export default function FacilityDetail({ facilityId, facility, readings, evaluations }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('readings');

  const compliantCount = evaluations.filter(e => e.overallCompliant).length;
  const rate = evaluations.length > 0 ? Math.round((compliantCount / evaluations.length) * 100) : null;
  const overallStatus = rate === null ? 'pending' : rate >= 80 ? 'compliant' : rate >= 50 ? 'warning' : 'violation';

  // Latest reading for parameter bars
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/facilities" className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} />
        Back to Facilities
      </Link>

      {/* Header Card */}
      <div className="card p-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {facility?.facilityName ?? facilityId}
              </h2>
              <StatusPill status={overallStatus} />
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><MapPin size={12} /> {facility?.district}, {facility?.state}</span>
              <span className="flex items-center gap-1"><Shield size={12} /> CTO: {facility?.ctoNumber}</span>
              <span className="flex items-center gap-1"><Cpu size={12} /> {facility?.ocemsSensorModel}</span>
            </div>
            {facility && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                  <KeyRound size={11} />
                  <span>KMS: </span>
                  <HederaId id={facility.deviceHederaAccountId} type="account" truncate />
                </div>
                <span className="pill pill-accent">
                  {facility.ctoDischargeMode.toUpperCase()}
                </span>
                <span className="pill pill-accent">
                  {facility.industryCategory}
                </span>
              </div>
            )}
          </div>

          {/* Compliance Rate Badge */}
          <div className="text-center px-4">
            <div className="text-3xl font-bold font-mono" style={{ color: rate !== null ? (rate >= 80 ? 'var(--compliant)' : 'var(--violation)') : 'var(--text-muted)' }}>
              {rate !== null ? `${rate}%` : '—'}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Compliance
            </div>
          </div>
        </div>

        {/* Latest reading parameter bars */}
        {latest && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-2 mt-5 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <ParameterBar parameter="pH" value={latest.pH} compact />
            <ParameterBar parameter="BOD_mgL" value={latest.BOD_mgL} compact />
            <ParameterBar parameter="COD_mgL" value={latest.COD_mgL} compact />
            <ParameterBar parameter="TSS_mgL" value={latest.TSS_mgL} compact />
            <ParameterBar parameter="temperature_C" value={latest.temperature_C} compact />
            <ParameterBar parameter="totalChromium_mgL" value={latest.totalChromium_mgL} compact />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-b-2"
            style={{
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-disabled)' }}>
              {tab.id === 'readings' ? readings.length : tab.id === 'compliance' ? evaluations.length : compliantCount}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'readings' && <ReadingsChart readings={readings} />}
      {activeTab === 'compliance' && <ComplianceHistory evaluations={evaluations} />}
      {activeTab === 'tokens' && (
        <div className="card p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                GGCC Credits Earned
              </div>
              <div className="text-3xl font-bold font-mono" style={{ color: 'var(--compliant)' }}>
                {compliantCount}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-disabled)' }}>
                Token: <HederaId id="0.0.8182260" type="token" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Violation Records
              </div>
              <div className="text-3xl font-bold font-mono" style={{ color: evaluations.filter(e => e.tokenAction === 'mint_violation_nft').length > 0 ? 'var(--violation)' : 'var(--text-disabled)' }}>
                {evaluations.filter(e => e.tokenAction === 'mint_violation_nft').length}
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-disabled)' }}>
                Token: <HederaId id="0.0.8182266" type="token" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
