'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWalletBalances, getShipmentHistory, WalletBalance, Shipment } from '@/lib/api';

export default function HubPage() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    getWalletBalances().then(setBalances).catch(() => {});
    getShipmentHistory().then(setShipments).catch(() => {});
  }, []);

  const primary = balances[0];
  const activeShipments = shipments.filter((s) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(s.status)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Two products, one account. Pick where you're headed.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Link
          href="/bank"
          className="group relative overflow-hidden rounded-2xl bg-obapay-navy p-8 text-white shadow-lg shadow-obapay-navy/20 transition-transform hover:-translate-y-1"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70"
            style={{ background: 'radial-gradient(circle at 85% 15%, rgba(15,181,174,0.4), transparent 50%)' }}
          />
          <div className="relative">
            <span className="inline-block rounded bg-obapay-teal/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-obapay-teal">NeoBank</span>
            <h2 className="mt-4 text-2xl font-bold">Wallet &amp; Payments</h2>
            <p className="mt-2 text-sm text-white/70">Free transfers, bill payments, and multi-currency wallets.</p>
            <p className="mt-6 text-3xl font-bold">
              {primary ? Number(primary.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
              <span className="ml-2 text-base font-semibold text-white/60">{primary?.currency ?? ''}</span>
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-obapay-teal">
              Open NeoBank <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </div>
        </Link>

        <Link
          href="/logistics"
          className="group relative overflow-hidden rounded-2xl bg-obapay-navy p-8 text-white shadow-lg shadow-obapay-navy/20 transition-transform hover:-translate-y-1"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70"
            style={{ background: 'radial-gradient(circle at 85% 15%, rgba(242,169,59,0.4), transparent 50%)' }}
          />
          <div className="relative">
            <span className="inline-block rounded bg-obapay-gold/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-obapay-gold">Logistics</span>
            <h2 className="mt-4 text-2xl font-bold">Shipping &amp; Customs</h2>
            <p className="mt-2 text-sm text-white/70">Rate-shop couriers, pay from your wallet, clear customs digitally.</p>
            <p className="mt-6 text-3xl font-bold">
              {activeShipments}
              <span className="ml-2 text-base font-semibold text-white/60">active shipment{activeShipments === 1 ? '' : 's'}</span>
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-obapay-gold">
              Open Logistics <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
