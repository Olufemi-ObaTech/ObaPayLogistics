'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getShipmentHistory, Shipment } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export default function ShipmentsListPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShipmentHistory()
      .then(setShipments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">My Shipments</h1>
        <Link href="/logistics/send-parcel" className="btn-primary">Send a Parcel</Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
        </div>
      )}
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!loading && shipments.length === 0 && (
        <div className="card border-dashed text-center">
          <p className="text-sm text-slate-500">No shipments yet. Send your first parcel to see it here.</p>
          <Link href="/logistics/send-parcel" className="btn-primary mt-4 inline-flex">Send a Parcel</Link>
        </div>
      )}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        {shipments.map((s) => (
          <Link key={s.id} href={`/logistics/shipments/${s.id}`} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-obapay-navy">
                {s.originAddress.city} → {s.destinationAddress.city}
              </p>
              <p className="truncate text-xs text-slate-400">
                {s.trackingNumber ?? 'No tracking number yet'} · {s.courierPartner?.name ?? '—'} · {new Date(s.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {s.finalPrice && (
                <span className="text-sm font-semibold text-obapay-navy">
                  {Number(s.finalPrice).toLocaleString()} {s.priceCurrency}
                </span>
              )}
              <StatusBadge status={s.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
