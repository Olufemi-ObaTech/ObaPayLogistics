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

const VALUE_PROPS = [
  { title: 'Free P2P transfers', body: 'Send and receive money across ObaPay wallets with zero fees, always.' },
  { title: 'Multi-currency wallets', body: 'Hold NGN, KES, ZAR, GHS, USD, EUR, XOF, and EGP in one account, side by side.' },
  { title: 'Ship anywhere in Africa', body: 'Rate-shop across DHL, Aramex, and Sendy — pay for shipping straight from your wallet.' },
  { title: 'Built-in customs clearance', body: 'Upload documents and generate pre-filled declarations in seconds.' },
  { title: 'Bank-grade account security', body: 'TOTP 2FA, device-fingerprinting, and step-up verification on every new device.' },
];

const STATS = [
  { value: '54', label: 'African countries supported' },
  { value: '0%', label: 'Fees on P2P transfers' },
  { value: '8', label: 'Wallet currencies' },
  { value: '3', label: 'Courier partners rate-shopped' },
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
      if (/TOTP code required/i.test(message)) setNeedsTotp(true);
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
    <div className="grid min-h-[calc(100vh-57px)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-obapay-navy px-12 py-16 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 15% 15%, rgba(15,181,174,0.35), transparent 45%), radial-gradient(circle at 85% 75%, rgba(242,169,59,0.25), transparent 40%)',
          }}
        />
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            Money and parcels,<br />one app.
          </h1>
          <p className="mt-4 max-w-md text-base text-white/70">
            ObaPay is a wallet and cross-border logistics platform for Africa — free transfers, transparent shipping, done in minutes.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-x-6 gap-y-5 xl:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-obapay-teal xl:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-xs text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="relative space-y-5">
          {VALUE_PROPS.map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-obapay-teal" />
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-sm text-white/60">{item.body}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-white/50">
            <span>🔒</span>
            <span>256-bit encryption in transit · TOTP two-factor authentication · Escrow-protected shipping payments</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-obapay-navy">Welcome to ObaPay</h1>
            <p className="mt-1 text-sm text-slate-500">Wallet, payments, and cross-border shipping — one app.</p>
          </div>

          <div className="mb-6 flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-semibold shadow-sm">
            <button
              className={`flex-1 rounded-md py-2 transition-colors ${mode === 'LOGIN' ? 'bg-obapay-navy text-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setMode('LOGIN'); setError(null); }}
            >
              Log in
            </button>
            <button
              className={`flex-1 rounded-md py-2 transition-colors ${mode === 'REGISTER' ? 'bg-obapay-navy text-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setMode('REGISTER'); setError(null); }}
            >
              Create account
            </button>
          </div>

          {error && (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </p>
          )}

          {mode === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="card space-y-4">
              <div>
                <label htmlFor="login-id" className="mb-1.5 block text-xs font-medium text-slate-600">Email or phone</label>
                <input
                  id="login-id" className="input" required
                  value={loginForm.emailOrPhone}
                  onChange={(e) => setLoginForm((f) => ({ ...f, emailOrPhone: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
                <input
                  id="login-password" className="input" type="password" required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              {needsTotp && (
                <div>
                  <label htmlFor="login-totp" className="mb-1.5 block text-xs font-medium text-slate-600">6-digit authenticator code</label>
                  <input
                    id="login-totp" className="input"
                    value={loginForm.totpCode}
                    onChange={(e) => setLoginForm((f) => ({ ...f, totpCode: e.target.value }))}
                  />
                </div>
              )}
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="card space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-first" className="mb-1.5 block text-xs font-medium text-slate-600">First name</label>
                  <input id="reg-first" className="input" required value={registerForm.firstName} onChange={(e) => setRegisterForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="reg-last" className="mb-1.5 block text-xs font-medium text-slate-600">Last name</label>
                  <input id="reg-last" className="input" required value={registerForm.lastName} onChange={(e) => setRegisterForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
                <input id="reg-email" className="input" type="email" required value={registerForm.email} onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="reg-phone" className="mb-1.5 block text-xs font-medium text-slate-600">Phone</label>
                <input id="reg-phone" className="input" placeholder="+2348012345678" required value={registerForm.phone} onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="reg-password" className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
                <input id="reg-password" className="input" type="password" minLength={10} placeholder="Min 10 characters" required value={registerForm.password} onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-country" className="mb-1.5 block text-xs font-medium text-slate-600">Country</label>
                  <select id="reg-country" className="input" value={registerForm.country} onChange={(e) => setRegisterForm((f) => ({ ...f, country: e.target.value }))}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-currency" className="mb-1.5 block text-xs font-medium text-slate-600">Currency</label>
                  <input id="reg-currency" className="input" maxLength={3} value={registerForm.preferredCurrency} onChange={(e) => setRegisterForm((f) => ({ ...f, preferredCurrency: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            P2P transfers, bill payments, and intra-wallet moves are always free.
          </p>
        </div>
      </div>
    </div>
  );
}
