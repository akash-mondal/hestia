import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusPill from '@/components/shared/status-pill';

describe('StatusPill', () => {
  it('renders compliant status with default label', () => {
    render(<StatusPill status="compliant" />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('renders violation status with default label', () => {
    render(<StatusPill status="violation" />);
    expect(screen.getByText('Violation')).toBeInTheDocument();
  });

  it('renders warning status with "Marginal" label', () => {
    render(<StatusPill status="warning" />);
    expect(screen.getByText('Marginal')).toBeInTheDocument();
  });

  it('renders pending status with default label', () => {
    render(<StatusPill status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('uses custom label when provided', () => {
    render(<StatusPill status="compliant" label="All Good" />);
    expect(screen.getByText('All Good')).toBeInTheDocument();
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
  });

  it('applies correct CSS class for compliant', () => {
    const { container } = render(<StatusPill status="compliant" />);
    expect(container.querySelector('.pill-compliant')).toBeInTheDocument();
  });

  it('applies correct CSS class for violation', () => {
    const { container } = render(<StatusPill status="violation" />);
    expect(container.querySelector('.pill-violation')).toBeInTheDocument();
  });

  it('applies correct CSS class for warning', () => {
    const { container } = render(<StatusPill status="warning" />);
    expect(container.querySelector('.pill-warning')).toBeInTheDocument();
  });

  it('applies correct CSS class for pending', () => {
    const { container } = render(<StatusPill status="pending" />);
    expect(container.querySelector('.pill-accent')).toBeInTheDocument();
  });

  it('renders an SVG icon', () => {
    const { container } = render(<StatusPill status="compliant" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has pill base class', () => {
    const { container } = render(<StatusPill status="compliant" />);
    expect(container.querySelector('.pill')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    const { container } = render(<StatusPill status="compliant" />);
    expect(container.querySelector('span.pill')).toBeInTheDocument();
  });
});
