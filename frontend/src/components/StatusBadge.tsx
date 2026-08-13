import { ShipmentStatus } from '@/lib/api';

const STYLES: Record<ShipmentStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  CUSTOMS_CLEARANCE: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  RETURNED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
