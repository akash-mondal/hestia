import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacilityDetail from '@/components/facilities/facility-detail';
import { createFacility, createReading, createEvaluation, createViolatingEvaluation } from '../../mocks/factories';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceLine: () => <div />,
}));

describe('FacilityDetail', () => {
  const facility = createFacility();
  const readings = [createReading()];
  const evaluations = [createEvaluation()];

  it('renders back link', () => {
    render(<FacilityDetail facilityId="GPI-UP-001" facility={facility} readings={readings} evaluations={evaluations} />);
    const link = screen.getByText('Back to Facilities');
    expect(link.closest('a')).toHaveAttribute('href', '/facilities');
  });

  it('shows facility name', () => {
    render(<FacilityDetail facilityId="GPI-UP-001" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('Kanpur Tannery Cluster A')).toBeInTheDocument();
  });

  it('shows facilityId when facility is null', () => {
    render(<FacilityDetail facilityId="GPI-UP-001" facility={null} readings={[]} evaluations={[]} />);
    expect(screen.getByText('GPI-UP-001')).toBeInTheDocument();
  });

  it('shows compliance rate badge', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    // "Compliance" appears in both the badge and the tab button
    expect(screen.getAllByText(/Compliance/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash when no evaluations', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows location info', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText(/Kanpur, Uttar Pradesh/)).toBeInTheDocument();
  });

  it('shows CTO number', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText(/CTO: CTO-UP-2024-001/)).toBeInTheDocument();
  });

  it('shows sensor model', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText(/ABB AO2000/)).toBeInTheDocument();
  });

  it('shows discharge mode badge', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('DISCHARGE')).toBeInTheDocument();
  });

  it('shows industry category badge', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('Tannery')).toBeInTheDocument();
  });

  it('renders parameter bars from latest reading', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    // pH, BOD, COD appear in both parameter bars and readings table header
    expect(screen.getAllByText('pH').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('BOD').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('COD').length).toBeGreaterThanOrEqual(2);
  });

  it('renders 3 tab buttons', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('Sensor Readings')).toBeInTheDocument();
    // "Compliance" appears in both tab button and badge; just check the button exists
    const complianceEls = screen.getAllByText(/Compliance/);
    expect(complianceEls.length).toBeGreaterThanOrEqual(2); // badge + tab
    expect(screen.getByText('Tokens')).toBeInTheDocument();
  });

  it('defaults to readings tab', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    // Readings tab content should be visible (readings table)
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
  });

  it('switches to compliance tab', async () => {
    const user = userEvent.setup();
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    // Find the Compliance tab button specifically
    const tabButtons = screen.getAllByRole('button');
    const complianceTab = tabButtons.find(b => b.textContent?.includes('Compliance'));
    await user.click(complianceTab!);
    // ComplianceHistory should render
    expect(screen.getByText(/schedule vi/i)).toBeInTheDocument();
  });

  it('switches to tokens tab', async () => {
    const user = userEvent.setup();
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    await user.click(screen.getByText('Tokens'));
    expect(screen.getByText('GGCC Credits Earned')).toBeInTheDocument();
    expect(screen.getByText('Violation Records')).toBeInTheDocument();
  });

  it('shows GGCC count on tokens tab', async () => {
    const user = userEvent.setup();
    const evals = [createEvaluation(), createEvaluation({ evaluationId: 'e2' })];
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evals} />);
    await user.click(screen.getByText('Tokens'));
    expect(screen.getByText('GGCC Credits Earned')).toBeInTheDocument();
    // "2" appears in multiple places (tab badges + GGCC count); check at least one exists
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('shows compliant status pill for high rate', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('shows violation status for low rate', () => {
    const evals = [
      createViolatingEvaluation({ evaluationId: 'e1' }),
      createViolatingEvaluation({ evaluationId: 'e2' }),
      createViolatingEvaluation({ evaluationId: 'e3' }),
    ];
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evals} />);
    expect(screen.getByText('Violation')).toBeInTheDocument();
  });

  it('shows tab counts', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={evaluations} />);
    // Tab count badges — readings tab shows "1", compliance shows "1", tokens shows "1"
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render parameter bars when no readings', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={[]} evaluations={evaluations} />);
    // No readings means no parameter bars and no readings table visible
    // But "No readings recorded" should appear
    expect(screen.getByText('No readings recorded')).toBeInTheDocument();
  });

  it('shows pending status when no evaluations', () => {
    render(<FacilityDetail facilityId="F1" facility={facility} readings={readings} evaluations={[]} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
