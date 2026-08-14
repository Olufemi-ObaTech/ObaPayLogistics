'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout as apiLogout, getMe, Profile } from '@/lib/api';
import { clearSession, isLoggedIn } from '@/lib/auth';
import { Avatar } from './Avatar';

const BANK_LINKS = [
  { href: '/bank', label: 'Wallet' },
  { href: '/bank/send', label: 'Send Money' },
  { href: '/bank/airtime', label: 'Airtime' },
  { href: '/bank/crypto', label: 'Crypto' },
  { href: '/bank/transactions', label: 'Activity' },
  { href: '/bank/settings', label: 'Security' },
];

const LOGISTICS_LINKS = [
  { href: '/logistics', label: 'Dashboard' },
  { href: '/logistics/send-parcel', label: 'Send a Parcel' },
  { href: '/logistics/shipments', label: 'My Shipments' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/transactions', label: 'Transactions' },
  { href: '/admin/shipments', label: 'Shipments' },
  { href: '/admin/fx-rates', label: 'FX Rates' },
];

const SUPERADMIN_LINKS = [{ href: '/admin/team', label: 'Team' }];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const nowLoggedIn = isLoggedIn();
    setLoggedIn(nowLoggedIn);
    setMenuOpen(false);
    if (nowLoggedIn && !profile) {
      getMe().then(setProfile).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    try { await apiLogout(); } catch { /* best-effort revoke */ }
    clearSession();
    setLoggedIn(false);
    setProfile(null);
    router.push('/login');
  }

  const inBank = pathname.startsWith('/bank');
  const inLogistics = pathname.startsWith('/logistics');
  const inAdmin = pathname.startsWith('/admin');
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';

  const links = inBank
    ? BANK_LINKS
    : inLogistics
      ? LOGISTICS_LINKS
      : inAdmin
        ? [...ADMIN_LINKS, ...(profile?.role === 'SUPERADMIN' ? SUPERADMIN_LINKS : [])]
        : [];
  const activeClass = inLogistics
    ? 'bg-obapay-gold text-obapay-navy font-semibold'
    : inAdmin
      ? 'bg-rose-400 text-obapay-navy font-semibold'
      : 'bg-obapay-teal text-obapay-navy font-semibold';

  const sectionBadge = inLogistics
    ? { label: 'Logistics', cls: 'bg-obapay-gold/20 text-obapay-gold' }
    : inAdmin
      ? { label: 'Admin', cls: 'bg-rose-400/20 text-rose-300' }
      : inBank
        ? { label: 'NeoBank', cls: 'bg-obapay-teal/20 text-obapay-teal' }
        : null;

  return (
    <nav className="sticky top-0 z-10 bg-obapay-navy text-white shadow-md shadow-obapay-navy/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href={loggedIn ? '/' : '/login'} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          Oba<span className="text-obapay-teal">Pay</span>
          {sectionBadge && (
            <span className={`hidden rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline ${sectionBadge.cls}`}>
              {sectionBadge.label}
            </span>
          )}
        </Link>

        {loggedIn && (
          <>
            <div className="hidden items-center gap-1.5 text-sm lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-2.5 py-1.5 transition-colors ${pathname === link.href ? activeClass : 'hover:bg-white/10'}`}
                >
                  {link.label}
                </Link>
              ))}
              {!inBank && (
                <Link href="/bank" className="ml-1 rounded border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white">NeoBank ↗</Link>
              )}
              {!inLogistics && (
                <Link href="/logistics" className="rounded border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white">Logistics ↗</Link>
              )}
              {isStaff && !inAdmin && (
                <Link href="/admin" className="rounded border border-rose-300/30 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:border-rose-300/60 hover:text-rose-200">Admin ↗</Link>
              )}
              {profile && (
                <Link href="/bank/settings" className="ml-1.5 flex-shrink-0" title={`${profile.firstName} ${profile.lastName}`}>
                  <Avatar firstName={profile.firstName} lastName={profile.lastName} size={30} />
                </Link>
              )}
              <button onClick={handleLogout} className="rounded px-2.5 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </div>

            <button className="rounded p-2 hover:bg-white/10 lg:hidden" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </>
        )}
      </div>

      {loggedIn && menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm lg:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded px-3 py-2 transition-colors ${pathname === link.href ? activeClass : 'hover:bg-white/10'}`}>
              {link.label}
            </Link>
          ))}
          {!inBank && <Link href="/bank" className="rounded border border-white/20 px-3 py-2 text-white/80">Switch to NeoBank</Link>}
          {!inLogistics && <Link href="/logistics" className="rounded border border-white/20 px-3 py-2 text-white/80">Switch to Logistics</Link>}
          {isStaff && !inAdmin && <Link href="/admin" className="rounded border border-rose-300/30 px-3 py-2 text-rose-300">Admin Panel</Link>}
          <button onClick={handleLogout} className="rounded px-3 py-2 text-left text-white/80 hover:bg-white/10 hover:text-white">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
