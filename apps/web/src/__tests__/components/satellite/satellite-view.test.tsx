import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SatelliteView from '@/components/satellite/satellite-view';
import { createFacility, createReading } from '../../mocks/factories';

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
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
}));

describe('SatelliteView', () => {
  const facility = createFacility({ facilityId: 'F1' });
  const reading = createReading({ facilityId: 'F1' });

  it('renders description text', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText(/Cross-validates OCEMS sensor data/)).toBeInTheDocument();
  });

  it('renders fetch button', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText('Fetch Satellite Data')).toBeInTheDocument();
  });

  it('renders map title', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText(/Sentinel-2 Coverage/)).toBeInTheDocument();
  });

  it('renders validation results section', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText('Cross-Validation Results')).toBeInTheDocument();
  });

  it('shows facility ID in results section', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    // F1 may appear multiple times (map tooltip + results section)
    expect(screen.getAllByText('F1').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Not fetched" before fetch', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText('Not fetched')).toBeInTheDocument();
  });

  it('shows OCEMS TSS value', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(screen.getByText('OCEMS TSS')).toBeInTheDocument();
    expect(screen.getByText('65.0 mg/L')).toBeInTheDocument();
  });

  it('shows source footer', () => {
    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    // May appear in both description and footer
    expect(screen.getAllByText(/Sentinel-2/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No facilities registered" when empty', () => {
    render(<SatelliteView facilities={[]} readings={[]} />);
    expect(screen.getByText('No facilities registered')).toBeInTheDocument();
  });

  it('button shows loading state when clicked', async () => {
    const user = userEvent.setup();
    // Mock fetch for satellite API
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'validated',
            facilityId: 'F1',
            satellite: { ndti: 0.12, turbidity_ntu: 15.3, image_date: '2026-03-18' },
            validation: { satellite_validated: true, anomaly_flag: false, correlation_confidence: 'high' },
          }),
        }), 100)
      )
    );

    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    await user.click(screen.getByText('Fetch Satellite Data'));
    expect(screen.getByText('Fetching...')).toBeInTheDocument();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Fetch Satellite Data')).toBeInTheDocument();
    });
  });

  it('shows satellite data after fetch', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'validated',
        facilityId: 'F1',
        satellite: { ndti: 0.12, turbidity_ntu: 15.3, image_date: '2026-03-18' },
        validation: { satellite_validated: true, anomaly_flag: false, correlation_confidence: 'high' },
      }),
    });

    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    await user.click(screen.getByText('Fetch Satellite Data'));

    await waitFor(() => {
      expect(screen.getByText('Validated')).toBeInTheDocument();
    });
  });

  it('handles fetch failure gracefully', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    await user.click(screen.getByText('Fetch Satellite Data'));

    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves

    render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    await user.click(screen.getByText('Fetch Satellite Data'));

    const button = screen.getByText('Fetching...').closest('button');
    expect(button).toBeDisabled();
  });

  it('renders grid layout with 3/5 and 2/5 columns', () => {
    const { container } = render(<SatelliteView facilities={[facility]} readings={[reading]} />);
    expect(container.querySelector('.grid-cols-5')).toBeInTheDocument();
    expect(container.querySelector('.col-span-3')).toBeInTheDocument();
    expect(container.querySelector('.col-span-2')).toBeInTheDocument();
  });
});
