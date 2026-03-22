import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }} data-role="regulator">
      <Sidebar />
      <div className="ml-[220px]">
        <Header />
        <main className="px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
