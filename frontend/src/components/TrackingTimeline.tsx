import { TrackingEvent } from '@/lib/api';
import { StatusBadge } from './StatusBadge';

export function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No tracking events yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 pl-4">
      {events.map((event, idx) => (
        <li key={event.id} className="mb-6 last:mb-0">
          <span
            className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${
              idx === 0 ? 'bg-obapay-teal' : 'bg-gray-300'
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <time className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</time>
          </div>
          <p className="mt-1 text-sm text-gray-700">{event.description}</p>
          <p className="text-xs text-gray-400">{event.location}</p>
        </li>
      ))}
    </ol>
  );
}
