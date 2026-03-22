import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hestia — Wildfire Resilience Credits',
  description: 'Blockchain-verified wildfire mitigation credits on Hedera Guardian. Nature → Measured Outcome → Tradable Unit → Financial Value.',
  icons: {
    icon: '/hestia-favicon.svg',
  },
};

export default function HestiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
