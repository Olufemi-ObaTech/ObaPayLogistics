import { Transaction } from '@/lib/api';

const TYPE_META: Record<string, { label: string; icon: string }> = {
  P2P_TRANSFER: { label: 'Transfer', icon: '↔' },
  BILL_PAYMENT: { label: 'Bill Payment', icon: '🧾' },
  MERCHANT_SETTLEMENT: { label: 'Merchant Payment', icon: '🏬' },
  FX_CONVERSION: { label: 'Currency Exchange', icon: '⇄' },
  SHIPPING_PAYMENT: { label: 'Shipping Payment', icon: '📦' },
  SHIPPING_REFUND: { label: 'Shipping Refund', icon: '↩' },
  WALLET_TOPUP: { label: 'Top Up', icon: '＋' },
  WALLET_WITHDRAWAL: { label: 'Withdrawal', icon: '－' },
};

export function TransactionRow({ txn }: { txn: Transaction }) {
  const meta = TYPE_META[txn.type] ?? { label: txn.type.replace(/_/g, ' '), icon: '•' };
  // Credits: money arriving (has a destination, no outgoing source on this txn's perspective isn't
  // knowable without the caller's wallet ids, so we use sign heuristics: refunds/topups are credits.
  const isCredit = ['SHIPPING_REFUND', 'WALLET_TOPUP'].includes(txn.type) || !txn.sourceWalletId;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{txn.narration || meta.label}</p>
        <p className="text-xs text-slate-400">{new Date(txn.createdAt).toLocaleString()}</p>
      </div>
      <span className={`flex-shrink-0 text-sm font-semibold ${isCredit ? 'text-emerald-600' : 'text-slate-700'}`}>
        {isCredit ? '+' : '-'}{Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {txn.currency}
      </span>
    </div>
  );
}
