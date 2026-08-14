import { avatarColor, initials } from '@/lib/display';

export function Avatar({ firstName, lastName, size = 40 }: { firstName?: string; lastName?: string; size?: number }) {
  const seed = `${firstName ?? ''}${lastName ?? ''}`;
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: avatarColor(seed || 'x') }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
