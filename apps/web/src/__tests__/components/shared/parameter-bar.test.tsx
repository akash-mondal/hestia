import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParameterBar from '@/components/shared/parameter-bar';

describe('ParameterBar', () => {
  it('renders pH label', () => {
    render(<ParameterBar parameter="pH" value={7.2} />);
    expect(screen.getByText('pH')).toBeInTheDocument();
  });

  it('renders BOD label', () => {
    render(<ParameterBar parameter="BOD_mgL" value={22} />);
    expect(screen.getByText('BOD')).toBeInTheDocument();
  });

  it('renders COD label', () => {
    render(<ParameterBar parameter="COD_mgL" value={180} />);
    expect(screen.getByText('COD')).toBeInTheDocument();
  });

  it('returns null for unknown parameter', () => {
    const { container } = render(<ParameterBar parameter="unknown_param" value={42} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows compliant color for pH within range', () => {
    render(<ParameterBar parameter="pH" value={7.2} />);
    const valueEl = screen.getByText('7.2');
    expect(valueEl.style.color).toBe('var(--compliant)');
  });

  it('shows violation color for pH below min', () => {
    render(<ParameterBar parameter="pH" value={4.0} />);
    const valueEl = screen.getByText('4.0');
    expect(valueEl.style.color).toBe('var(--violation)');
  });

  it('shows violation color for pH above max', () => {
    render(<ParameterBar parameter="pH" value={10.5} />);
    const valueEl = screen.getByText('10.5');
    expect(valueEl.style.color).toBe('var(--violation)');
  });

  it('shows compliant color for BOD within limit', () => {
    render(<ParameterBar parameter="BOD_mgL" value={22} />);
    const valueEl = screen.getByText('22.0');
    expect(valueEl.style.color).toBe('var(--compliant)');
  });

  it('shows violation color for BOD exceeding limit', () => {
    render(<ParameterBar parameter="BOD_mgL" value={45} />);
    const valueEl = screen.getByText('45.0');
    expect(valueEl.style.color).toBe('var(--violation)');
  });

  it('shows unit for mg/L parameters', () => {
    render(<ParameterBar parameter="BOD_mgL" value={22} />);
    expect(screen.getByText('mg/L')).toBeInTheDocument();
  });

  it('does not show unit for pH', () => {
    render(<ParameterBar parameter="pH" value={7.2} />);
    expect(screen.queryByText('mg/L')).not.toBeInTheDocument();
  });

  it('renders bar element', () => {
    const { container } = render(<ParameterBar parameter="COD_mgL" value={180} />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('uses compact spacing class when compact=true', () => {
    const { container } = render(<ParameterBar parameter="pH" value={7.0} compact />);
    expect(container.querySelector('.space-y-0\\.5')).toBeInTheDocument();
  });

  it('uses normal spacing class when compact=false', () => {
    const { container } = render(<ParameterBar parameter="pH" value={7.0} />);
    expect(container.querySelector('.space-y-1')).toBeInTheDocument();
  });

  it('uses compact text size when compact=true', () => {
    const { container } = render(<ParameterBar parameter="pH" value={7.0} compact />);
    expect(container.querySelector('.text-\\[10px\\]')).toBeInTheDocument();
  });

  it('compliant for BOD at exactly 30 (boundary)', () => {
    render(<ParameterBar parameter="BOD_mgL" value={30} />);
    const valueEl = screen.getByText('30.0');
    expect(valueEl.style.color).toBe('var(--compliant)');
  });

  it('violation for BOD at 30.1 (just over)', () => {
    render(<ParameterBar parameter="BOD_mgL" value={30.1} />);
    const valueEl = screen.getByText('30.1');
    expect(valueEl.style.color).toBe('var(--violation)');
  });

  it('renders temperature parameter', () => {
    render(<ParameterBar parameter="temperature_C" value={35} />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
  });

  it('renders chromium parameter', () => {
    render(<ParameterBar parameter="totalChromium_mgL" value={1.5} />);
    expect(screen.getByText('Total Cr')).toBeInTheDocument();
  });
});
