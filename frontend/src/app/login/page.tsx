'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api';
import { getDeviceId, setSession } from '@/lib/auth';

// Must match the backend's allowed country list (App\Support\AfricanCountryCodes).
const COUNTRIES = [
  'NG', 'KE', 'ZA', 'GH', 'EG', 'ET', 'TZ', 'UG', 'RW', 'CI',
  'SN', 'CM', 'ML', 'BF', 'DZ', 'MA', 'TN', 'ZM', 'ZW', 'MZ',
  'AO', 'CD', 'BJ', 'TG', 'NE', 'TD', 'GA', 'CG', 'SL', 'LR',
];

type Mode = 'LOGIN' | 'REGISTER';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTotp, setNeedsTotp] = useState(false);

  const [loginForm, setLoginForm] = useState({ emailOrPhone: '', password: '', totpCode: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '', phone: '', password: '', firstName: '', lastName: '', country: 'NG', preferredCurrency: 'NGN',
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tokens = await login({
        emailOrPhone: loginForm.emailOrPhone,
        password: loginForm.password,
        totpCode: loginForm.totpCode || undefined,
        deviceFingerprint: getDeviceId(),
      });
      setSession(tokens.accessToken, tokens.refreshToken);
      router.push('/');
    } catch (err) {
      const message = (err as Error).message;
      // Surface the step-up form instead of just failing, so a 2FA-enrolled
      // user (or an unrecognized device) can complete the challenge inline.
      if (/TOTP code required/i.test(message)) {
        setNeedsTotp(true);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tokens = await register({ ...registerForm, deviceFingerprint: getDeviceId() });
      setSession(tokens.accessToken, tokens.refreshToken);
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex rounded-lg border border-gray-200 bg-white p-1 text-sm font-semibold">
        <button
          className={`flex-1 rounded-md py-2 transition-colors ${mode === 'LOGIN' ? 'bg-obapay-navy text-white' : 'text-gray-500'}`}
          onClick={() => { setMode('LOGIN'); setError(null); }}
        >
          Log in
        </button>
        <button
          className={`flex-1 rounded-md py-2 transition-colors ${mode === 'REGISTER' ? 'bg-obapay-navy text-white' : 'text-gray-500'}`}
          onClick={() => { setMode('REGISTER'); setError(null); }}
        >
          Create account
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {mode === 'LOGIN' ? (
        <form onSubmit={handleLogin} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <input
            className="input" placeholder="Email or phone" required
            value={loginForm.emailOrPhone}
            onChange={(e) => setLoginForm((f) => ({ ...f, emailOrPhone: e.target.value }))}
          />
          <input
            className="input" type="password" placeholder="Password" required
            value={loginForm.password}
            onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
          />
          {needsTotp && (
            <input
              className="input" placeholder="6-digit authenticator code"
              value={loginForm.totpCode}
              onChange={(e) => setLoginForm((f) => ({ ...f, totpCode: e.target.value }))}
            />
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="input" placeholder="First name" required value={registerForm.firstName} onChange={(e) => setRegisterForm((f) => ({ ...f, firstName: e.target.value }))} />
            <input className="input" placeholder="Last name" required value={registerForm.lastName} onChange={(e) => setRegisterForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <input className="input" type="email" placeholder="Email" required value={registerForm.email} onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="input" placeholder="Phone, e.g. +2348012345678" required value={registerForm.phone} onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))} />
          <input className="input" type="password" placeholder="Password (min 10 characters)" minLength={10} required value={registerForm.password} onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select className="input" value={registerForm.country} onChange={(e) => setRegisterForm((f) => ({ ...f, country: e.target.value }))}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input" placeholder="Preferred currency" maxLength={3} value={registerForm.preferredCurrency} onChange={(e) => setRegisterForm((f) => ({ ...f, preferredCurrency: e.target.value.toUpperCase() }))} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
