'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout as apiLogout } from '@/lib/api';
import { clearSession, isLoggedIn } from '@/lib/auth';

const LINKS = [
  { href: '/', label: 'Wallet' },
  { href: '/logistics/send-parcel', label: 'Send a Parcel' },
  { href: '/logistics/shipments', label: 'My Shipments' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // Read localStorage only after mount — avoids a server/client render mismatch.
  useEffect(() => setLoggedIn(isLoggedIn()), [pathname]);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // Best-effort revoke; the session is cleared locally regardless.
    }
    clearSession();
    setLoggedIn(false);
    router.push('/login');
  }

  return (
    <nav className="sticky top-0 z-10 bg-obapay-navy text-white shadow-md shadow-obapay-navy/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Oba<span className="text-obapay-teal">Pay</span>
        </Link>

        {loggedIn && (
          <>
            {/* Desktop/tablet links */}
            <div className="hidden items-center gap-2 text-sm sm:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    pathname === link.href ? 'bg-obapay-teal text-obapay-navy font-semibold' : 'hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button onClick={handleLogout} className="ml-2 rounded px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="rounded p-2 hover:bg-white/10 sm:hidden"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </>
        )}
      </div>

      {loggedIn && menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm sm:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded px-3 py-2 transition-colors ${
                pathname === link.href ? 'bg-obapay-teal text-obapay-navy font-semibold' : 'hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="rounded px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
