'use client';

import { useEffect, useState } from 'react';
import { getAdminStats, AdminStats } from '@/lib/api';
import { CURRENCY_FLAGS } from '@/lib/display';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Admin Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide stats across NeoBank and Logistics.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Users</p>
              <p className="mt-1 text-3xl font-bold text-obapay-navy">{stats.totalUsers}</p>
              <p className="mt-1 text-xs text-slate-400">{stats.usersByStatus.ACTIVE ?? 0} active</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Transactions</p>
              <p className="mt-1 text-3xl font-bold text-obapay-navy">{stats.totalTransactions}</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Shipments</p>
              <p className="mt-1 text-3xl font-bold text-obapay-navy">{stats.totalShipments}</p>
              <p className="mt-1 text-xs text-slate-400">{stats.shipmentsByStatus.DELIVERED ?? 0} delivered</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pending Doc Reviews</p>
              <p className="mt-1 text-3xl font-bold text-amber-500">{stats.pendingDocumentReviews}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-semibold text-obapay-navy">Wallet Balances by Currency</h2>
              <div className="space-y-2">
                {stats.walletsByCurrency.map((w) => (
                  <div key={w.currency} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{CURRENCY_FLAGS[w.currency] ?? ''} {w.currency}</span>
                    <span className="font-semibold text-obapay-navy">{Number(w.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold text-obapay-navy">Revenue Captured (fees + FX spread)</h2>
              <div className="space-y-2">
                {stats.revenueByCurrency.map((r) => (
                  <div key={r.currency} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{CURRENCY_FLAGS[r.currency] ?? ''} {r.currency}</span>
                    <span className="font-semibold text-emerald-600">
                      {(Number(r.fees) + Number(r.fxSpread)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                {stats.revenueByCurrency.length === 0 && <p className="text-sm text-slate-400">No revenue yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
