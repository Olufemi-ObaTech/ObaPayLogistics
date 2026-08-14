'use client';

import { useEffect, useState } from 'react';
import { getAdminShipments, Shipment } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminShipments().then((res) => setShipments(res.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Shipments</h1>
        <p className="mt-1 text-sm text-slate-500">Every shipment across the platform, with tracking status.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Tracking #</th>
              <th className="px-4 py-3">Courier</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No shipments yet.</td></tr>
            ) : (
              shipments.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-slate-700">{s.originAddress.city} → {s.destinationAddress.city}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.trackingNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.courierPartner?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-obapay-navy">{s.finalPrice ? `${Number(s.finalPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${s.priceCurrency}` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
