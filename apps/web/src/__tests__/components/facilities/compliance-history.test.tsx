import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplianceHistory from '@/components/facilities/compliance-history';
import { createEvaluation, createViolatingEvaluation } from '../../mocks/factories';

describe('ComplianceHistory', () => {
  it('shows empty state when no evaluations', () => {
    render(<ComplianceHistory evaluations={[]} />);
    expect(screen.getByText('No compliance evaluations for this facility')).toBeInTheDocument();
  });

  it('renders evaluation cards', () => {
    const { container } = render(<ComplianceHistory evaluations={[createEvaluation()]} />);
    expect(container.querySelectorAll('.card')).toHaveLength(1);
  });

  it('shows compliant status pill for compliant eval', () => {
    render(<ComplianceHistory evaluations={[createEvaluation()]} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('shows violation status for non-compliant with critical', () => {
    render(<ComplianceHistory evaluations={[createViolatingEvaluation()]} />);
    expect(screen.getByText('Violation')).toBeInTheDocument();
  });

  it('shows warning status for non-compliant without critical', () => {
    const e = createViolatingEvaluation({ criticalViolationCount: 0 });
    render(<ComplianceHistory evaluations={[e]} />);
    expect(screen.getByText('Marginal')).toBeInTheDocument();
  });

  it('shows GGCC Minted pill for mint_ggcc', () => {
    render(<ComplianceHistory evaluations={[createEvaluation({ tokenAction: 'mint_ggcc' })]} />);
    expect(screen.getByText('GGCC Minted')).toBeInTheDocument();
  });

  it('shows ZVIOL Issued pill for mint_violation_nft', () => {
    render(<ComplianceHistory evaluations={[createViolatingEvaluation({ tokenAction: 'mint_violation_nft' })]} />);
    expect(screen.getByText('ZVIOL Issued')).toBeInTheDocument();
  });

  it('shows Pending Review pill', () => {
    render(<ComplianceHistory evaluations={[createEvaluation({ tokenAction: 'pending_review' })]} />);
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('renders 6 parameter compliance boxes', () => {
    const { container } = render(<ComplianceHistory evaluations={[createEvaluation()]} />);
    const paramBoxes = container.querySelectorAll('.grid-cols-6 > div');
    expect(paramBoxes).toHaveLength(6);
  });

  it('shows parameter labels', () => {
    render(<ComplianceHistory evaluations={[createEvaluation()]} />);
    expect(screen.getByText('pH')).toBeInTheDocument();
    expect(screen.getByText('BOD')).toBeInTheDocument();
    expect(screen.getByText('COD')).toBeInTheDocument();
    expect(screen.getByText('TSS')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    expect(screen.getByText('Cr')).toBeInTheDocument();
  });

  it('shows violation count and critical count', () => {
    const e = createViolatingEvaluation({ violationCount: 3, criticalViolationCount: 1 });
    render(<ComplianceHistory evaluations={[e]} />);
    expect(screen.getByText('3 violations | 1 critical')).toBeInTheDocument();
  });

  it('shows singular violation text', () => {
    const e = createViolatingEvaluation({ violationCount: 1 });
    render(<ComplianceHistory evaluations={[e]} />);
    expect(screen.getByText(/1 violation \|/)).toBeInTheDocument();
  });

  it('shows limits source', () => {
    render(<ComplianceHistory evaluations={[createEvaluation({ limitsSource: 'schedule_vi' })]} />);
    expect(screen.getByText(/Limits: schedule vi/)).toBeInTheDocument();
  });

  it('sorts evaluations descending by date', () => {
    const evals = [
      createEvaluation({ evaluationId: 'old', evaluatedAt: '2026-03-18T10:00:00Z' }),
      createEvaluation({ evaluationId: 'new', evaluatedAt: '2026-03-19T10:00:00Z' }),
    ];
    const { container } = render(<ComplianceHistory evaluations={evals} />);
    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(2);
    // First card should be newer
  });

  it('renders multiple evaluations', () => {
    const evals = [
      createEvaluation({ evaluationId: 'e1' }),
      createEvaluation({ evaluationId: 'e2' }),
      createEvaluation({ evaluationId: 'e3' }),
    ];
    const { container } = render(<ComplianceHistory evaluations={evals} />);
    expect(container.querySelectorAll('.card')).toHaveLength(3);
  });
});
