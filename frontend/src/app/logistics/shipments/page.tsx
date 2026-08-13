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
        <h1 className="text-2xl font-bold text-obapay-navy">My Shipments</h1>
        <Link href="/logistics/send-parcel" className="btn-primary">Send a Parcel</Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading shipments…</p>}
      {error && <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!loading && shipments.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No shipments yet. Send your first parcel to see it here.
        </p>
      )}

      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
        {shipments.map((s) => (
          <Link key={s.id} href={`/logistics/shipments/${s.id}`} className="flex flex-col gap-3 px-5 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-obapay-navy">
                {s.originAddress.city} → {s.destinationAddress.city}
              </p>
              <p className="truncate text-xs text-gray-400">
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
