import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentActivity from '@/components/dashboard/recent-activity';
import { createReading, createEvaluation, createViolatingEvaluation, createFacility } from '../../mocks/factories';

describe('RecentActivity', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const recentTimestamp = () => new Date(now - 60_000).toISOString();

  it('shows empty state when no data', () => {
    render(<RecentActivity readings={[]} evaluations={[]} registrations={[]} />);
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
  });

  it('renders reading events', () => {
    const r = createReading({ timestamp: recentTimestamp(), facilityId: 'GPI-UP-001' });
    render(<RecentActivity readings={[r]} evaluations={[]} registrations={[]} />);
    expect(screen.getByText('GPI-UP-001')).toBeInTheDocument();
    expect(screen.getByText(/pH.*BOD.*COD/)).toBeInTheDocument();
  });

  it('renders compliant evaluation events', () => {
    const e = createEvaluation({ evaluatedAt: recentTimestamp() });
    render(<RecentActivity readings={[]} evaluations={[e]} registrations={[]} />);
    expect(screen.getByText(/All parameters compliant/)).toBeInTheDocument();
  });

  it('renders violation evaluation events', () => {
    const e = createViolatingEvaluation({ evaluatedAt: recentTimestamp(), violationCount: 3, tokenAction: 'mint_violation_nft' });
    render(<RecentActivity readings={[]} evaluations={[e]} registrations={[]} />);
    expect(screen.getByText(/3 violations.*ZVIOL NFT issued/)).toBeInTheDocument();
  });

  it('renders singular violation text', () => {
    const e = createViolatingEvaluation({ evaluatedAt: recentTimestamp(), violationCount: 1, tokenAction: 'mint_violation_nft' });
    render(<RecentActivity readings={[]} evaluations={[e]} registrations={[]} />);
    expect(screen.getByText(/1 violation —/)).toBeInTheDocument();
  });

  it('renders pending review text', () => {
    const e = createViolatingEvaluation({ evaluatedAt: recentTimestamp(), violationCount: 2, tokenAction: 'pending_review' });
    render(<RecentActivity readings={[]} evaluations={[e]} registrations={[]} />);
    expect(screen.getByText(/pending review/)).toBeInTheDocument();
  });

  it('renders registration events', () => {
    const f = createFacility({ facilityName: 'Test Factory' });
    render(<RecentActivity readings={[]} evaluations={[]} registrations={[f]} />);
    expect(screen.getByText(/Test Factory registered/)).toBeInTheDocument();
  });

  it('merges events from all sources', () => {
    const r = createReading({ timestamp: recentTimestamp() });
    const e = createEvaluation({ evaluatedAt: recentTimestamp() });
    const f = createFacility();
    render(<RecentActivity readings={[r]} evaluations={[e]} registrations={[f]} />);
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('caps at 12 events', () => {
    const readings = Array.from({ length: 15 }, (_, i) =>
      createReading({ timestamp: new Date(now - (i + 1) * 60_000).toISOString() })
    );
    const { container } = render(<RecentActivity readings={readings} evaluations={[]} registrations={[]} />);
    // Each event is rendered in a div with flex items-start
    const eventDivs = container.querySelectorAll('.divide-y > div:not(.text-center)');
    // There should be at most 12 visible events (the component slices to 12)
    expect(eventDivs.length).toBeLessThanOrEqual(12);
  });

  it('shows total event count in header', () => {
    const readings = Array.from({ length: 5 }, (_, i) =>
      createReading({ timestamp: new Date(now - (i + 1) * 60_000).toISOString() })
    );
    render(<RecentActivity readings={readings} evaluations={[]} registrations={[]} />);
    expect(screen.getByText('5 events')).toBeInTheDocument();
  });

  it('sorts events by timestamp descending', () => {
    const r1 = createReading({ timestamp: new Date(now - 60_000).toISOString(), facilityId: 'FIRST' });
    const r2 = createReading({ timestamp: new Date(now - 120_000).toISOString(), facilityId: 'SECOND' });
    const { container } = render(<RecentActivity readings={[r2, r1]} evaluations={[]} registrations={[]} />);
    const facilityIds = Array.from(container.querySelectorAll('.font-mono.text-xs.font-semibold'))
      .map(el => el.textContent);
    // FIRST should come before SECOND (more recent)
    expect(facilityIds[0]).toBe('FIRST');
    expect(facilityIds[1]).toBe('SECOND');
  });

  it('displays Recent Activity header', () => {
    render(<RecentActivity readings={[]} evaluations={[]} registrations={[]} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('renders SVG icons for events', () => {
    const r = createReading({ timestamp: recentTimestamp() });
    const { container } = render(<RecentActivity readings={[r]} evaluations={[]} registrations={[]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders timeAgo text', () => {
    const r = createReading({ timestamp: new Date(now - 30_000).toISOString() });
    render(<RecentActivity readings={[r]} evaluations={[]} registrations={[]} />);
    expect(screen.getByText('30s ago')).toBeInTheDocument();
  });

  it('shows reading summary with values', () => {
    const r = createReading({ timestamp: recentTimestamp(), pH: 6.8, BOD_mgL: 25, COD_mgL: 200 });
    render(<RecentActivity readings={[r]} evaluations={[]} registrations={[]} />);
    expect(screen.getByText(/pH 6.8.*BOD 25.*COD 200/)).toBeInTheDocument();
  });
});
