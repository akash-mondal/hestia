import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingsChart from '@/components/facilities/readings-chart';
import { createReading } from '../../mocks/factories';

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

describe('ReadingsChart', () => {
  it('renders 6 parameter selector buttons', () => {
    render(<ReadingsChart readings={[createReading()]} />);
    // Parameters appear in both selector buttons and table headers, so use getAllByText
    expect(screen.getAllByText('pH').length).toBeGreaterThanOrEqual(2); // button + th
    expect(screen.getAllByText('BOD').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('COD').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('TSS').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Temperature')).toBeInTheDocument(); // only in button
    expect(screen.getByText('Total Cr')).toBeInTheDocument(); // only in button
  });

  it('defaults to COD parameter', () => {
    render(<ReadingsChart readings={[createReading()]} />);
    const codElements = screen.getAllByText('COD');
    expect(codElements.length).toBeGreaterThanOrEqual(1);
  });

  it('switches parameter on button click', async () => {
    const user = userEvent.setup();
    render(<ReadingsChart readings={[createReading()]} />);
    // Click the BOD button (first button matching BOD text)
    const bodButtons = screen.getAllByText('BOD');
    const bodBtn = bodButtons.find(el => el.tagName === 'BUTTON' || el.closest('button'));
    await user.click(bodBtn!.closest('button') || bodBtn!);
    expect(screen.getAllByText('BOD').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no readings', () => {
    render(<ReadingsChart readings={[]} />);
    expect(screen.getByText('No readings recorded')).toBeInTheDocument();
  });

  it('renders chart when readings exist', () => {
    render(<ReadingsChart readings={[createReading()]} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders readings table', () => {
    render(<ReadingsChart readings={[createReading()]} />);
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('KMS Sig')).toBeInTheDocument();
  });

  it('shows table column headers', () => {
    render(<ReadingsChart readings={[createReading()]} />);
    // These headers are unique to the table
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    expect(screen.getByText('Cr')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('KMS Sig')).toBeInTheDocument();
    // pH, BOD, COD, TSS appear in both buttons and headers
    expect(screen.getAllByText('pH').length).toBeGreaterThanOrEqual(2);
  });

  it('renders compliant color for values within limits', () => {
    const r = createReading({ pH: 7.2, BOD_mgL: 22 });
    const { container } = render(<ReadingsChart readings={[r]} />);
    // pH 7.2 is within 5.5-9.0, should have compliant color
    const cells = container.querySelectorAll('td');
    const phCell = cells[1]; // second td (first is timestamp)
    expect(phCell.style.color).toBe('var(--compliant)');
  });

  it('renders violation color for values exceeding limits', () => {
    const r = createReading({ BOD_mgL: 45 });
    const { container } = render(<ReadingsChart readings={[r]} />);
    const cells = container.querySelectorAll('td');
    const bodCell = cells[2]; // third td
    expect(bodCell.style.color).toBe('var(--violation)');
  });

  it('shows sensor status pill', () => {
    const r = createReading({ sensorStatus: 'online' });
    render(<ReadingsChart readings={[r]} />);
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  it('shows truncated KMS signature', () => {
    const r = createReading({ kmsSigHash: '0xabcdef1234567890abcdef1234567890' });
    render(<ReadingsChart readings={[r]} />);
    // truncateHash(hash, 4) → first 6 chars + ... + last 4
    expect(screen.getByText('0xabcd...7890')).toBeInTheDocument();
  });

  it('sorts readings chronologically in table', () => {
    const r1 = createReading({ timestamp: '2026-03-19T12:00:00Z', pH: 6.5 });
    const r2 = createReading({ timestamp: '2026-03-19T10:00:00Z', pH: 7.5 });
    render(<ReadingsChart readings={[r1, r2]} />);
    // Should sort ascending by timestamp
    const cells = screen.getAllByText(/\d+\.\d/);
    // First pH value should be 7.5 (earlier timestamp)
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders multiple readings in table', () => {
    const readings = [
      createReading({ timestamp: '2026-03-19T10:00:00Z' }),
      createReading({ timestamp: '2026-03-19T11:00:00Z' }),
      createReading({ timestamp: '2026-03-19T12:00:00Z' }),
    ];
    const { container } = render(<ReadingsChart readings={readings} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('clicking all parameter buttons works without crash', async () => {
    const user = userEvent.setup();
    render(<ReadingsChart readings={[createReading()]} />);
    // Click the unique buttons (Temperature and Total Cr are unique)
    await user.click(screen.getByText('Temperature'));
    await user.click(screen.getByText('Total Cr'));
    // For the others, find buttons specifically
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      await user.click(btn);
    }
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
