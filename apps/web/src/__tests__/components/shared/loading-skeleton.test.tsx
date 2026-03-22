import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard, SkeletonTable, SkeletonChart } from '@/components/shared/loading-skeleton';

describe('SkeletonCard', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="my-custom" />);
    expect(container.querySelector('.my-custom')).toBeInTheDocument();
  });

  it('renders card wrapper', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('renders default 5 rows', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('renders default 6 columns', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll('thead th')).toHaveLength(6);
  });

  it('renders custom rows and cols', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.querySelectorAll('thead th')).toHaveLength(4);
  });

  it('renders table element', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('has skeleton divs in cells', () => {
    const { container } = render(<SkeletonTable rows={1} cols={1} />);
    expect(container.querySelector('td .skeleton')).toBeInTheDocument();
  });
});

describe('SkeletonChart', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<SkeletonChart />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonChart className="chart-skel" />);
    expect(container.querySelector('.chart-skel')).toBeInTheDocument();
  });

  it('renders card wrapper', () => {
    const { container } = render(<SkeletonChart />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });
});
