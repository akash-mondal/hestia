import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrustChainExplorer from '@/components/trust-chain/trust-chain-explorer';
import { createFacility, createReading, createEvaluation, createViolatingEvaluation } from '../../mocks/factories';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

describe('TrustChainExplorer', () => {
  const facility = createFacility({ facilityId: 'F1' });
  const reading = createReading({ facilityId: 'F1' });
  const evaluation = createEvaluation({ facilityId: 'F1' });

  it('renders dropdown selector', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText(/Select a facility/)).toBeInTheDocument();
  });

  it('renders expand all button', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Expand All')).toBeInTheDocument();
  });

  it('shows empty state when no facility selected and no evaluations', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[]} evaluations={[]} />);
    expect(screen.getByText(/Select a facility to explore/)).toBeInTheDocument();
  });

  it('auto-selects first facility from evaluations', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    // Should show Level 1 (token) since there is an evaluation
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  it('shows 6 levels when all data present', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    expect(screen.getByText('Level 6')).toBeInTheDocument();
  });

  it('shows token level title', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('GGCC Compliance Credit')).toBeInTheDocument();
  });

  it('shows ZVIOL title for violating eval', () => {
    const violationEval = createViolatingEvaluation({ facilityId: 'F1' });
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[violationEval]} />);
    expect(screen.getByText('ZVIOL Violation Record')).toBeInTheDocument();
  });

  it('shows compliance evaluation level', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Compliance Evaluation')).toBeInTheDocument();
  });

  it('shows sensor reading level', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Sensor Reading (KMS-Signed)')).toBeInTheDocument();
  });

  it('shows facility registration level', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Facility Registration')).toBeInTheDocument();
  });

  it('shows KMS proof level', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('KMS Cryptographic Proof')).toBeInTheDocument();
  });

  it('shows satellite level', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText('Satellite Cross-Validation')).toBeInTheDocument();
  });

  it('L1 and L2 are expanded by default', () => {
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    // L1 expanded: should show Token ID field
    expect(screen.getByText('Token ID')).toBeInTheDocument();
    // L2 expanded: should show Evaluation ID field
    expect(screen.getByText('Evaluation ID')).toBeInTheDocument();
  });

  it('expand all button expands all levels', async () => {
    const user = userEvent.setup();
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    await user.click(screen.getByText('Expand All'));
    // L4 field should now be visible
    expect(screen.getByText('CTO Number')).toBeInTheDocument();
    // L5 field
    expect(screen.getByText('Algorithm')).toBeInTheDocument();
    // L6 field
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('clicking a level toggles expand/collapse', async () => {
    const user = userEvent.setup();
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    // L1 is expanded, click to collapse
    await user.click(screen.getByText('GGCC Compliance Credit'));
    // Token ID should no longer be visible
    expect(screen.queryByText('Token ID')).not.toBeInTheDocument();
    // Click again to expand
    await user.click(screen.getByText('GGCC Compliance Credit'));
    expect(screen.getByText('Token ID')).toBeInTheDocument();
  });

  it('shows HashScan links in expanded fields', async () => {
    const user = userEvent.setup();
    render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    await user.click(screen.getByText('Expand All'));
    // Token ID has a link
    const tokenLink = screen.getByText(/0\.0\.8182260/);
    expect(tokenLink.closest('a')).toHaveAttribute('href', expect.stringContaining('hashscan.io'));
  });

  it('shows verified badges on all levels', () => {
    const { container } = render(<TrustChainExplorer facilities={[facility]} readings={[reading]} evaluations={[evaluation]} />);
    // Each level has a CheckCircle2 icon for verified
    const verifiedIcons = container.querySelectorAll('svg');
    expect(verifiedIcons.length).toBeGreaterThan(5);
  });

  it('renders dropdown with facility options', () => {
    const facilities = [
      createFacility({ facilityId: 'F1', facilityName: 'Plant A' }),
      createFacility({ facilityId: 'F2', facilityName: 'Plant B' }),
    ];
    render(<TrustChainExplorer facilities={facilities} readings={[reading]} evaluations={[evaluation]} />);
    expect(screen.getByText(/F1 — Plant A/)).toBeInTheDocument();
    expect(screen.getByText(/F2 — Plant B/)).toBeInTheDocument();
  });

  it('changes facility on dropdown selection', async () => {
    const user = userEvent.setup();
    const facilities = [
      createFacility({ facilityId: 'F1', facilityName: 'Plant A' }),
      createFacility({ facilityId: 'F2', facilityName: 'Plant B' }),
    ];
    const r2 = createReading({ facilityId: 'F2' });
    const e2 = createEvaluation({ facilityId: 'F2' });
    render(<TrustChainExplorer facilities={facilities} readings={[reading, r2]} evaluations={[evaluation, e2]} />);
    await user.selectOptions(screen.getByRole('combobox'), 'F2');
    // Should now show F2 data
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });
});
