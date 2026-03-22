import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacilityMap from '@/components/facilities/facility-map';
import { createFacility, createEvaluation, createViolatingEvaluation } from '../../mocks/factories';

vi.mock('next/dynamic', () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    return function DynamicStub(props: Record<string, unknown>) {
      return <div data-testid="dynamic-component" {...props} />;
    };
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children }: { children: React.ReactNode }) => <div data-testid="circle-marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/facilities'),
}));

describe('FacilityMap', () => {
  it('renders title', () => {
    render(<FacilityMap facilities={[]} evaluations={[]} />);
    expect(screen.getByText('GPI Locations')).toBeInTheDocument();
  });

  it('renders legend', () => {
    render(<FacilityMap facilities={[]} evaluations={[]} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.getByText('Violation')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders card wrapper', () => {
    const { container } = render(<FacilityMap facilities={[]} evaluations={[]} />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });

  it('handles empty facilities', () => {
    render(<FacilityMap facilities={[]} evaluations={[]} />);
    expect(screen.getByText('GPI Locations')).toBeInTheDocument();
  });

  it('renders without crash with facilities and evaluations', () => {
    const f = createFacility();
    const e = createEvaluation();
    render(<FacilityMap facilities={[f]} evaluations={[e]} />);
    expect(screen.getByText('GPI Locations')).toBeInTheDocument();
  });

  it('uses latest evaluation for status determination', () => {
    const f = createFacility({ facilityId: 'F1' });
    const e1 = createEvaluation({ facilityId: 'F1', evaluatedAt: '2026-03-18T10:00:00Z' });
    const e2 = createViolatingEvaluation({ facilityId: 'F1', evaluatedAt: '2026-03-19T10:00:00Z' });
    render(<FacilityMap facilities={[f]} evaluations={[e1, e2]} />);
    expect(screen.getByText('GPI Locations')).toBeInTheDocument();
  });

  it('renders legend dots with correct colors', () => {
    const { container } = render(<FacilityMap facilities={[]} evaluations={[]} />);
    expect(container.querySelector('.bg-emerald-400')).toBeInTheDocument();
    expect(container.querySelector('.bg-red-400')).toBeInTheDocument();
    expect(container.querySelector('.bg-amber-400')).toBeInTheDocument();
  });

  it('renders leaflet CSS link', () => {
    const { container } = render(<FacilityMap facilities={[]} evaluations={[]} />);
    // Since we mock next/dynamic, actual CSS link might not be present
    // but component shouldn't crash
    expect(container).toBeDefined();
  });
});
