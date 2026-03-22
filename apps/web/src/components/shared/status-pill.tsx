'use client';

import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

type Status = 'compliant' | 'violation' | 'warning' | 'pending';

const CONFIG: Record<Status, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  compliant: { label: 'Compliant', className: 'pill-compliant', Icon: CheckCircle2 },
  violation: { label: 'Violation', className: 'pill-violation', Icon: XCircle },
  warning: { label: 'Marginal', className: 'pill-warning', Icon: AlertTriangle },
  pending: { label: 'Pending', className: 'pill-accent', Icon: Clock },
};

export default function StatusPill({ status, label }: { status: Status; label?: string }) {
  const { label: defaultLabel, className, Icon } = CONFIG[status];
  return (
    <span className={`pill ${className}`}>
      <Icon size={10} />
      {label ?? defaultLabel}
    </span>
  );
}
