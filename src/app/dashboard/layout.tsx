'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-gray-950 text-white md:ml-0">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
