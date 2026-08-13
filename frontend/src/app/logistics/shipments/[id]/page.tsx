'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getCustomsStatus,
  trackShipment,
  uploadCustomsDocument,
  Shipment,
  TrackingEvent,
} from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { TrackingTimeline } from '@/components/TrackingTimeline';

const DOCUMENT_TYPES = ['INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'ID_DOCUMENT', 'OTHER'];
// Real-time tracking is polled on this interval; a WebSocket/SSE channel
// would replace this in a later iteration without changing the UI below.
const POLL_INTERVAL_MS = 15_000;

export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [customs, setCustoms] = useState<{ missingDocuments: string[]; documents: { documentType: string; verificationStatus: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [fileUrl, setFileUrl] = useState('');

  const refresh = useCallback(async () => {
    if (!params.id) return;
    try {
      const [trackResult, customsResult] = await Promise.all([
        trackShipment(params.id),
        getCustomsStatus(params.id).catch(() => null),
      ]);
      setShipment(trackResult.shipment);
      setEvents(trackResult.events);
      if (customsResult) setCustoms(customsResult);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [params.id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!params.id || !fileUrl) return;
    setUploading(true);
    setError(null);
    try {
      await uploadCustomsDocument({ shipmentId: params.id, documentType: docType, fileUrl });
      setFileUrl('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (error) return <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  if (!shipment) return <p className="text-sm text-gray-500">Loading shipment…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400">Tracking Number</p>
              <p className="font-mono text-lg font-bold text-obapay-navy">{shipment.trackingNumber ?? 'Pending'}</p>
            </div>
            <StatusBadge status={shipment.status} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-400">From</p>
              <p>{shipment.originAddress.line1}, {shipment.originAddress.city}, {shipment.originAddress.country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">To</p>
              <p>{shipment.destinationAddress.line1}, {shipment.destinationAddress.city}, {shipment.destinationAddress.country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Courier</p>
              <p>{shipment.courierPartner?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Paid</p>
              <p>{shipment.finalPrice ? `${Number(shipment.finalPrice).toLocaleString()} ${shipment.priceCurrency}` : '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-obapay-navy">Tracking Timeline</h2>
          <TrackingTimeline events={events} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-semibold text-obapay-navy">Customs Clearance</h2>
          {customs && customs.missingDocuments.length > 0 && (
            <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-700">
              Missing: {customs.missingDocuments.join(', ')}
            </p>
          )}
          <ul className="mb-4 space-y-1 text-sm">
            {(customs?.documents ?? []).map((d, i) => (
              <li key={i} className="flex justify-between">
                <span>{d.documentType.replace(/_/g, ' ')}</span>
                <span className="text-emerald-600">{d.verificationStatus}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleUpload} className="space-y-3">
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              className="input"
              placeholder="Document URL (from your upload provider)"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              required
            />
            <button type="submit" disabled={uploading} className="btn-primary w-full">
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>
          </form>

          <a
            href={`${process.env.NEXT_PUBLIC_API_BASE}/customs/form/${shipment.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-xs text-obapay-teal hover:underline"
          >
            Download pre-filled customs declaration (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
