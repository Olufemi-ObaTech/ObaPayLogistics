export const CURRENCY_FLAGS: Record<string, string> = {
  NGN: '🇳🇬', KES: '🇰🇪', ZAR: '🇿🇦', GHS: '🇬🇭',
  USD: '🇺🇸', EUR: '🇪🇺', XOF: '🇸🇳', EGP: '🇪🇬',
};

export const KYC_TIER_LABELS: Record<string, string> = {
  TIER_1: 'Tier 1 · Basic',
  TIER_2: 'Tier 2 · Verified',
  TIER_3: 'Tier 3 · Business',
};

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

// Deterministic avatar color from a string (name/email) so the same person
// always gets the same color without storing anything server-side.
const AVATAR_PALETTE = ['#0FB5AE', '#F2A93B', '#6366F1', '#EC4899', '#10B981', '#F97316'];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
