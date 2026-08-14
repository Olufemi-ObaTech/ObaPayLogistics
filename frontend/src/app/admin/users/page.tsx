'use client';

import { useEffect, useState } from 'react';
import { getAdminUsers, updateUserStatus, AdminUser } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(searchTerm = '') {
    setLoading(true);
    getAdminUsers({ search: searchTerm || undefined })
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateUserStatus(id, status);
      setUsers((list) => list.map((u) => (u.id === id ? { ...u, status: updated.status } : u)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Search, review, and manage account status.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
        <input className="input" placeholder="Search by name, email, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-secondary flex-shrink-0">Search</button>
      </form>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">KYC</th>
              <th className="px-4 py-3">Wallets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.country}</td>
                  <td className="px-4 py-3 text-slate-600">{u.kycTier.replace('TIER_', 'T')}</td>
                  <td className="px-4 py-3 text-slate-600">{u.walletsCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[u.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {u.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === 'ACTIVE' ? (
                      <button disabled={busyId === u.id} onClick={() => handleStatusChange(u.id, 'SUSPENDED')} className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">
                        Suspend
                      </button>
                    ) : u.status === 'SUSPENDED' ? (
                      <button disabled={busyId === u.id} onClick={() => handleStatusChange(u.id, 'ACTIVE')} className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50">
                        Reactivate
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
