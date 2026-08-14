'use client';

import { useEffect, useState } from 'react';
import { enableTotp, confirmTotp, getMe, Profile } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { KYC_TIER_LABELS, CURRENCY_FLAGS } from '@/lib/display';

type Step = 'LOADING' | 'ENABLED' | 'IDLE' | 'SETUP' | 'DONE';

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', ZA: '🇿🇦', GH: '🇬🇭', EG: '🇪🇬', ET: '🇪🇹', TZ: '🇹🇿', UG: '🇺🇬',
  RW: '🇷🇼', CI: '🇨🇮', SN: '🇸🇳', CM: '🇨🇲', ML: '🇲🇱', BF: '🇧🇫', DZ: '🇩🇿', MA: '🇲🇦',
};

export default function SecuritySettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>('LOADING');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMe()
      .then((p) => { setProfile(p); setStep(p.totpEnabled ? 'ENABLED' : 'IDLE'); })
      .catch((err) => { setError(err.message); setStep('IDLE'); });
  }, []);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await enableTotp();
      setSecret(res.secret);
      setStep('SETUP');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmTotp(code);
      setStep('DONE');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    navigator.clipboard?.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Security</h1>
        <p className="mt-1 text-sm text-slate-500">Your profile and account protection settings.</p>
      </div>

      {profile && (
        <div className="card flex items-center gap-4">
          <Avatar firstName={profile.firstName} lastName={profile.lastName} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-obapay-navy">{profile.firstName} {profile.lastName}</p>
            <p className="truncate text-sm text-slate-500">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-obapay-teal/10 px-2 py-0.5 text-[11px] font-semibold text-obapay-teal">
                {KYC_TIER_LABELS[profile.kycTier]}
              </span>
              <span className="text-xs text-slate-400">{COUNTRY_FLAGS[profile.country] ?? ''} {profile.country}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="mt-0.5">⚠</span><span>{error}</span>
        </p>
      )}

      {step === 'ENABLED' && (
        <div className="card flex items-start gap-4 border-emerald-200 bg-emerald-50/60">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-600">✓</span>
          <div>
            <h2 className="font-semibold text-emerald-800">Two-factor authentication is on</h2>
            <p className="mt-1 text-sm text-emerald-700">You'll be asked for a code when logging in from an unrecognized device.</p>
          </div>
        </div>
      )}

      {step === 'IDLE' && (
        <div className="card flex items-start gap-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-obapay-teal/10 text-lg text-obapay-teal">🔐</span>
          <div className="flex-1">
            <h2 className="font-semibold text-obapay-navy">Authenticator App (TOTP)</h2>
            <p className="mt-1 text-sm text-slate-500">Not enabled. Turn this on to require a 6-digit code from an app like Google Authenticator or Authy every time you log in from a new device.</p>
            <button onClick={startSetup} disabled={busy} className="btn-primary mt-4">
              {busy ? 'Setting up…' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      )}

      {step === 'SETUP' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-obapay-navy">Scan or enter this key</h2>
          <p className="text-sm text-slate-500">Add this secret to your authenticator app, then enter the 6-digit code it shows to confirm setup.</p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <code className="flex-1 break-all text-sm font-mono text-slate-700">{secret}</code>
            <button type="button" onClick={copySecret} className="flex-shrink-0 text-xs font-semibold text-obapay-teal hover:underline">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <form onSubmit={handleConfirm} className="space-y-3">
            <div>
              <label htmlFor="totp-confirm" className="mb-1.5 block text-xs font-medium text-slate-600">6-digit code</label>
              <input id="totp-confirm" className="input" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Confirming…' : 'Confirm & Enable'}
            </button>
          </form>
        </div>
      )}

      {step === 'DONE' && (
        <div className="animate-pop-in card space-y-3 border-emerald-200 bg-emerald-50 text-center">
          <div className="animate-check mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
          <h2 className="font-semibold text-emerald-800">2FA is now enabled</h2>
          <p className="text-sm text-emerald-700">You'll be asked for a code the next time you log in from an unrecognized device.</p>
        </div>
      )}
    </div>
  );
}
