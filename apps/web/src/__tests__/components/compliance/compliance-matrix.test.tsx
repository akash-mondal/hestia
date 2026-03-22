import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplianceMatrix from '@/components/compliance/compliance-matrix';
import { createFacility, createReading, createEvaluation, createViolatingEvaluation, createMultipleFacilities } from '../../mocks/factories';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

describe('ComplianceMatrix', () => {
  it('renders title', () => {
    render(<ComplianceMatrix facilities={[]} readings={[]} evaluations={[]} />);
    expect(screen.getByText('CPCB Schedule-VI Compliance Matrix')).toBeInTheDocument();
  });

  it('shows facility × parameter count', () => {
    const facilities = createMultipleFacilities(3);
    render(<ComplianceMatrix facilities={facilities} readings={[]} evaluations={[]} />);
    expect(screen.getByText(/3 facilities.*6 parameters/)).toBeInTheDocument();
  });

  it('renders table headers for 6 parameters', () => {
    render(<ComplianceMatrix facilities={[createFacility()]} readings={[]} evaluations={[]} />);
    expect(screen.getByText('pH')).toBeInTheDocument();
    expect(screen.getByText('BOD')).toBeInTheDocument();
    expect(screen.getByText('COD')).toBeInTheDocument();
    expect(screen.getByText('TSS')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    expect(screen.getByText('Cr')).toBeInTheDocument();
  });

  it('renders facility link', () => {
    const f = createFacility({ facilityId: 'GPI-UP-001' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[]} />);
    const link = screen.getByText('GPI-UP-001');
    expect(link.closest('a')).toHaveAttribute('href', '/facilities/GPI-UP-001');
  });

  it('shows dash for no evaluation', () => {
    const f = createFacility();
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[]} />);
    // Should show "—" for each parameter + action column
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows parameter values from evaluation', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createEvaluation({ facilityId: 'F1', pH_value: 7.2, BOD_value: 22 });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('7.2')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('shows GGCC action pill', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createEvaluation({ facilityId: 'F1', tokenAction: 'mint_ggcc' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('GGCC')).toBeInTheDocument();
  });

  it('shows ZVIOL action pill', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createViolatingEvaluation({ facilityId: 'F1', tokenAction: 'mint_violation_nft' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('ZVIOL')).toBeInTheDocument();
  });

  it('shows Review action pill', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createEvaluation({ facilityId: 'F1', tokenAction: 'pending_review' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows overall compliant status', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createEvaluation({ facilityId: 'F1' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('shows overall violation status', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createViolatingEvaluation({ facilityId: 'F1' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('Violation')).toBeInTheDocument();
  });

  it('shows pending status when no evaluation', () => {
    const f = createFacility({ facilityId: 'F1' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[]} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders footer compliance rates when evaluations exist', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e = createEvaluation({ facilityId: 'F1' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e]} />);
    expect(screen.getByText('Parameter Compliance Rate')).toBeInTheDocument();
    // 100% appears multiple times (once per parameter in footer)
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render footer when no evaluations', () => {
    render(<ComplianceMatrix facilities={[createFacility()]} readings={[]} evaluations={[]} />);
    expect(screen.queryByText('Parameter Compliance Rate')).not.toBeInTheDocument();
  });

  it('uses latest evaluation per facility', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e1 = createEvaluation({ facilityId: 'F1', evaluatedAt: '2026-03-18T10:00:00Z', pH_value: 6.0 });
    const e2 = createEvaluation({ facilityId: 'F1', evaluatedAt: '2026-03-19T10:00:00Z', pH_value: 7.5 });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[e1, e2]} />);
    // Latest eval has pH 7.5
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  it('renders facility name under ID', () => {
    const f = createFacility({ facilityName: 'My Plant' });
    render(<ComplianceMatrix facilities={[f]} readings={[]} evaluations={[]} />);
    expect(screen.getByText('My Plant')).toBeInTheDocument();
  });
});
