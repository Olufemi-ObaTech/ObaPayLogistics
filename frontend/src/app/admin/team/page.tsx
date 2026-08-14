'use client';

import { useEffect, useState } from 'react';
import { getAdminTeam, getAdminUsers, promoteToAdmin, demoteAdmin, AdminUser } from '@/lib/api';
import { Avatar } from '@/components/Avatar';

export default function AdminTeamPage() {
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function loadTeam() {
    setLoading(true);
    getAdminTeam().then(setTeam).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(loadTeam, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    try {
      const res = await getAdminUsers({ search });
      setResults(res.data.filter((u) => u.role === 'USER'));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePromote(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await promoteToAdmin(id);
      setResults((r) => r.filter((u) => u.id !== id));
      loadTeam();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDemote(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await demoteAdmin(id);
      loadTeam();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Team</h1>
        <p className="mt-1 text-sm text-slate-500">Super admins can promote users to admin, or step admins back down.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="card">
        <h2 className="mb-3 font-semibold text-obapay-navy">Promote a user</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="input" placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn-secondary flex-shrink-0">Search</button>
        </form>
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar firstName={u.firstName} lastName={u.lastName} size={32} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <button disabled={busyId === u.id} onClick={() => handlePromote(u.id)} className="text-xs font-semibold text-obapay-teal hover:underline disabled:opacity-50">
                  Make Admin
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-obapay-navy">Current Team</h2>
        {loading ? (
          <div className="card h-24 animate-pulse bg-slate-100" />
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            {team.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar firstName={u.firstName} lastName={u.lastName} size={36} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === 'SUPERADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {u.role}
                  </span>
                  {u.role === 'ADMIN' && (
                    <button disabled={busyId === u.id} onClick={() => handleDemote(u.id)} className="text-xs font-semibold text-slate-400 hover:text-rose-600 hover:underline disabled:opacity-50">
                      Demote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
