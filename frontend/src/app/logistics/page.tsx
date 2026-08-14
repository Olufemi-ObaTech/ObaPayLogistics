'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getShipmentHistory, Shipment } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

const IN_TRANSIT_STATUSES = ['PAID', 'PICKED_UP', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE'];

export default function LogisticsDashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShipmentHistory()
      .then(setShipments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => IN_TRANSIT_STATUSES.includes(s.status)).length,
    delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Logistics</h1>
          <p className="mt-1 text-sm text-slate-500">Rate-shop, ship, and clear customs across Africa — paid straight from your wallet.</p>
        </div>
        <Link href="/logistics/send-parcel" className="btn-logistics flex-shrink-0">Send a Parcel</Link>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Shipments</p>
          <p className="mt-1 text-3xl font-bold text-obapay-navy">{loading ? '—' : stats.total}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">In Transit</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">{loading ? '—' : stats.inTransit}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Delivered</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{loading ? '—' : stats.delivered}</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-obapay-navy">Recent Shipments</h2>
          <Link href="/logistics/shipments" className="text-xs font-medium text-obapay-gold hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="card h-24 animate-pulse bg-slate-100" />
        ) : shipments.length === 0 ? (
          <div className="card border-dashed text-center">
            <p className="text-sm text-slate-500">No shipments yet.</p>
            <Link href="/logistics/send-parcel" className="btn-logistics mt-4 inline-flex">Send your first parcel</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            {shipments.slice(0, 5).map((s) => (
              <Link key={s.id} href={`/logistics/shipments/${s.id}`} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-obapay-navy">{s.originAddress.city} → {s.destinationAddress.city}</p>
                  <p className="truncate text-xs text-slate-400">{s.trackingNumber ?? 'No tracking number yet'}</p>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
