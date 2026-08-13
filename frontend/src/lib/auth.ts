// Client-side auth/session helpers shared by the login page and Nav.

const TOKEN_KEY = 'obapay_access_token';
const REFRESH_KEY = 'obapay_refresh_token';
const DEVICE_KEY = 'obapay_device_id';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * A stable per-browser identifier used as the "device fingerprint" the
 * backend uses for its unknown-device step-up check. A random id persisted
 * in localStorage is enough to distinguish "this browser I've seen before"
 * from "a new device" — the backend never trusts it as a strong identity
 * signal on its own, only as a step-up trigger.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
