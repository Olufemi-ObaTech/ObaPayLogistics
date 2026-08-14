'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout as apiLogout } from '@/lib/api';
import { clearSession, isLoggedIn } from '@/lib/auth';

const BANK_LINKS = [
  { href: '/bank', label: 'Wallet' },
  { href: '/bank/send', label: 'Send Money' },
  { href: '/bank/transactions', label: 'Activity' },
  { href: '/bank/settings', label: 'Security' },
];

const LOGISTICS_LINKS = [
  { href: '/logistics', label: 'Dashboard' },
  { href: '/logistics/send-parcel', label: 'Send a Parcel' },
  { href: '/logistics/shipments', label: 'My Shipments' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => { setLoggedIn(isLoggedIn()); setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    try { await apiLogout(); } catch { /* best-effort revoke */ }
    clearSession();
    setLoggedIn(false);
    router.push('/login');
  }

  const inBank = pathname.startsWith('/bank');
  const inLogistics = pathname.startsWith('/logistics');
  const links = inBank ? BANK_LINKS : inLogistics ? LOGISTICS_LINKS : [];
  const activeClass = inLogistics ? 'bg-obapay-gold text-obapay-navy font-semibold' : 'bg-obapay-teal text-obapay-navy font-semibold';
  const switchTo = inBank ? { href: '/logistics', label: 'Logistics ↗' } : inLogistics ? { href: '/bank', label: 'NeoBank ↗' } : null;

  return (
    <nav className="sticky top-0 z-10 bg-obapay-navy text-white shadow-md shadow-obapay-navy/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href={loggedIn ? '/' : '/login'} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          Oba<span className="text-obapay-teal">Pay</span>
          {(inBank || inLogistics) && (
            <span className={`hidden rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline ${inLogistics ? 'bg-obapay-gold/20 text-obapay-gold' : 'bg-obapay-teal/20 text-obapay-teal'}`}>
              {inLogistics ? 'Logistics' : 'NeoBank'}
            </span>
          )}
        </Link>

        {loggedIn && (
          <>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 transition-colors ${pathname === link.href ? activeClass : 'hover:bg-white/10'}`}
                >
                  {link.label}
                </Link>
              ))}
              {switchTo && (
                <Link href={switchTo.href} className="ml-1 rounded border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white">
                  {switchTo.label}
                </Link>
              )}
              <button onClick={handleLogout} className="ml-1 rounded px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </div>

            <button className="rounded p-2 hover:bg-white/10 sm:hidden" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </>
        )}
      </div>

      {loggedIn && menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm sm:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded px-3 py-2 transition-colors ${pathname === link.href ? activeClass : 'hover:bg-white/10'}`}>
              {link.label}
            </Link>
          ))}
          {switchTo && (
            <Link href={switchTo.href} className="rounded border border-white/20 px-3 py-2 text-white/80">
              Switch to {switchTo.label.replace(' ↗', '')}
            </Link>
          )}
          <button onClick={handleLogout} className="rounded px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
