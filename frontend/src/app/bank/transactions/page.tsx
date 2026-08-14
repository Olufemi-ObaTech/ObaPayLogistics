'use client';

import { useEffect, useState } from 'react';
import { getTransactions, Transaction } from '@/lib/api';
import { TransactionRow } from '@/components/TransactionRow';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obapay-navy sm:text-3xl">Activity</h1>
        <p className="mt-1 text-sm text-slate-500">Every transfer, payment, and shipping charge across your wallets.</p>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">No transactions yet.</div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          {transactions.map((txn) => <TransactionRow key={txn.id} txn={txn} />)}
        </div>
      )}
    </div>
  );
}
