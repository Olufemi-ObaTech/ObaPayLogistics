'use client';

import { useEffect, useState } from 'react';
import { getAdminTransactions, Transaction } from '@/lib/api';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminTransactions().then((res) => setTransactions(res.data)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">Every transaction across every user's wallet, platform-wide.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Narration</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No transactions yet.</td></tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-slate-600">{t.type.replace(/_/g, ' ')}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">{t.narration}</td>
                  <td className="px-4 py-3 font-semibold text-obapay-navy">{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
