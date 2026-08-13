'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';

const FULL_BLEED_PATHS = ['/login'];

/** The login page gets a full-bleed split-screen layout; everything else gets the standard centered container. */
export function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = FULL_BLEED_PATHS.includes(pathname);

  if (fullBleed) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <AuthGuard>{children}</AuthGuard>
    </main>
  );
}
