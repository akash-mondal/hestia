import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacilityTable from '@/components/facilities/facility-table';
import { createFacility, createMultipleFacilities } from '../../mocks/factories';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

describe('FacilityTable', () => {
  const emptyMap = new Map<string, { compliant: number; total: number }>();

  it('shows header with count', () => {
    const facilities = createMultipleFacilities(3);
    render(<FacilityTable facilities={facilities} complianceMap={emptyMap} />);
    expect(screen.getByText('Registered Facilities (3)')).toBeInTheDocument();
  });

  it('renders empty state when no facilities', () => {
    render(<FacilityTable facilities={[]} complianceMap={emptyMap} />);
    expect(screen.getByText('No facilities registered')).toBeInTheDocument();
  });

  it('renders facility IDs as links', () => {
    const f = createFacility({ facilityId: 'GPI-UP-001' });
    render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    const link = screen.getByText('GPI-UP-001').closest('a');
    expect(link).toHaveAttribute('href', '/facilities/GPI-UP-001');
  });

  it('shows facility name', () => {
    const f = createFacility({ facilityName: 'Test Plant' });
    render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    expect(screen.getByText('Test Plant')).toBeInTheDocument();
  });

  it('shows industry category', () => {
    const f = createFacility({ industryCategory: 'Textile' });
    render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    expect(screen.getByText('Textile')).toBeInTheDocument();
  });

  it('shows discharge mode uppercase', () => {
    const f = createFacility({ ctoDischargeMode: 'ZLD' });
    render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    expect(screen.getByText('ZLD')).toBeInTheDocument();
  });

  it('shows pending status when no compliance data', () => {
    const f = createFacility();
    render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows compliant status for >=80% rate', () => {
    const f = createFacility({ facilityId: 'F1' });
    const map = new Map([['F1', { compliant: 8, total: 10 }]]);
    render(<FacilityTable facilities={[f]} complianceMap={map} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.getByText('80% compliant')).toBeInTheDocument();
  });

  it('shows warning status for 50-79% rate', () => {
    const f = createFacility({ facilityId: 'F1' });
    const map = new Map([['F1', { compliant: 6, total: 10 }]]);
    render(<FacilityTable facilities={[f]} complianceMap={map} />);
    expect(screen.getByText('Marginal')).toBeInTheDocument();
  });

  it('shows violation status for <50% rate', () => {
    const f = createFacility({ facilityId: 'F1' });
    const map = new Map([['F1', { compliant: 3, total: 10 }]]);
    render(<FacilityTable facilities={[f]} complianceMap={map} />);
    expect(screen.getByText('Violation')).toBeInTheDocument();
  });

  it('renders multiple facilities', () => {
    const facilities = createMultipleFacilities(5);
    render(<FacilityTable facilities={facilities} complianceMap={emptyMap} />);
    expect(screen.getByText('GPI-UP-001')).toBeInTheDocument();
    expect(screen.getByText('GPI-UP-005')).toBeInTheDocument();
  });

  it('renders chevron icons', () => {
    const f = createFacility();
    const { container } = render(<FacilityTable facilities={[f]} complianceMap={emptyMap} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows compliance percentage in row', () => {
    const f = createFacility({ facilityId: 'F1' });
    const map = new Map([['F1', { compliant: 9, total: 10 }]]);
    render(<FacilityTable facilities={[f]} complianceMap={map} />);
    expect(screen.getByText('90% compliant')).toBeInTheDocument();
  });
});
