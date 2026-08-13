'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Wallet' },
  { href: '/logistics/send-parcel', label: 'Send a Parcel' },
  { href: '/logistics/shipments', label: 'My Shipments' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-obapay-navy text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span className="text-lg font-bold tracking-tight">
          Oba<span className="text-obapay-teal">Pay</span>
        </span>
        <div className="flex gap-4 text-sm">
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
        </div>
      </div>
    </nav>
  );
}
