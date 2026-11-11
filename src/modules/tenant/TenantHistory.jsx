import { useState } from 'react';
import { Receipt as ReceiptIcon } from 'lucide-react';
import { Card, PageHeader, Tabs, EmptyState } from '../../components/ui';
import { money, fmtDate, fmtDateTime, sum } from '../../lib/format';
import { balance } from '../../lib/billing';
import { Method, InvStatus } from '../shared/bits';
import ReceiptModal from '../shared/Receipt';
import { useTenant } from './useTenant';

export default function TenantHistory() {
  const t = useTenant();
  const [tab, setTab] = useState('payments');
  const [receipt, setReceipt] = useState(null);
  return (
    <div className="space-y-5">
      <PageHeader title="Payments & bills" subtitle={`${money(sum(t.payments, (p) => p.amount))} paid in total`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'payments', label: 'Receipts', count: t.payments.length }, { value: 'bills', label: 'Bills', count: t.invoices.length }]} />
      {tab === 'payments' ? (
        t.payments.length ? (
          <Card className="divide-y divide-ivory-200 dark:divide-white/5">
            {t.payments.map((p) => (
              <button key={p.id} type="button" onClick={() => setReceipt(p)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
                <Method m={p.method} compact />
                <div className="min-w-0 flex-1"><p className="truncate font-mono text-xs text-slate-500">{p.ref}</p><p className="text-xs text-slate-400">{fmtDateTime(p.at)}</p></div>
                <b className="text-emerald-600">{money(p.amount)}</b>
                <ReceiptIcon className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </Card>
        ) : <Card><EmptyState title="No payments yet" /></Card>
      ) : (
        <Card className="divide-y divide-ivory-200 dark:divide-white/5">
          {[...t.invoices].reverse().map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.title}</p><p className="text-xs text-slate-500">Due {fmtDate(i.due)} · {money(i.amount)}</p></div>
              <div className="text-right"><p className="text-sm font-bold">{balance(i) > 0 ? money(balance(i)) : ''}</p><InvStatus inv={i} /></div>
            </div>
          ))}
        </Card>
      )}
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
