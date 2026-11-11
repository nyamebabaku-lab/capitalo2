import { useState } from 'react';
import { CheckSquare, Square, CreditCard, ShieldCheck } from 'lucide-react';
import { payOnline } from '../../lib/pay';
import { Card, Button, PageHeader, cx, toast, EmptyState } from '../../components/ui';
import PayModal from '../../components/PayModal';
import PayLogo from '../../components/PayLogo';
import { balance } from '../../lib/billing';
import { money, sum, fmtDate, round2 } from '../../lib/format';
import { InvStatus } from '../shared/bits';
import ReceiptModal from '../shared/Receipt';
import { useTenant } from './useTenant';

export default function TenantPay() {
  const t = useTenant();
  const [picked, setPicked] = useState(() => t.open.filter((i) => i.due <= new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10)).map((i) => i.id));
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const total = round2(sum(t.open.filter((i) => picked.includes(i.id)), balance));
  const approved = t.owner.status === 'approved';
  return (
    <div className="space-y-5">
      <PageHeader title="Pay rent & bills" subtitle={`Paying ${t.owner.company}`} />
      {t.open.length ? (
        <Card className="divide-y divide-ivory-200 dark:divide-white/5">
          {t.open.map((i) => {
            const on = picked.includes(i.id);
            return (
              <button key={i.id} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== i.id) : [...picked, i.id])} className="flex w-full items-center gap-3 p-4 text-left">
                {on ? <CheckSquare className="h-5 w-5 shrink-0 text-brand-600" /> : <Square className="h-5 w-5 shrink-0 text-slate-300" />}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.title}</p><p className="text-xs text-slate-500">Due {fmtDate(i.due)}{i.paid ? ` · ${money(i.paid)} already paid` : ''}</p></div>
                <div className="text-right"><p className="text-sm font-bold">{money(balance(i))}</p><InvStatus inv={i} /></div>
              </button>
            );
          })}
        </Card>
      ) : <Card><EmptyState icon={CheckSquare} title="Nothing to pay right now" text="New bills appear here 14 days before they are due." /></Card>}

      <Card className="sticky bottom-24 p-5 shadow-lift lg:bottom-6">
        <div className="flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Selected</p><p className="text-2xl font-extrabold">{money(total)}</p></div>
          <Button size="lg" icon={CreditCard} disabled={!approved || (!total && !t.lease)} onClick={() => setOpen(true)}>Pay now</Button>
        </div>
        <div className="mt-3 flex items-center gap-1.5">{['mtn', 'telecel', 'at', 'card'].map((m) => <PayLogo key={m} method={m} className="h-6 w-9 rounded-lg" />)}<span className="ml-1 text-[11px] text-slate-400">You can also pay part of it</span></div>
        {!approved && <p className="mt-3 text-xs text-amber-700">Online payment is not switched on for this landlord yet.</p>}
      </Card>
      <p className={cx('flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400')}><ShieldCheck className="h-3.5 w-3.5" /> Payments go straight to {t.owner.company} through {t.owner.provider === 'hubtel' ? 'Hubtel' : 'Paystack'}.</p>

      <PayModal open={open} onClose={() => setOpen(false)} title={`Pay ${t.owner.company}`} subtitle={`${t.unit?.label} · ${t.property?.name}`} amount={total || t.lease?.rent} phone={t.tenant.phone} payee={t.owner.company}
        presets={[t.dueNow > 0 && { label: 'Due now', value: t.dueNow }, t.lease && { label: '1 month', value: t.lease.rent }, t.totalOpen > 0 && { label: 'Everything', value: t.totalOpen }].filter(Boolean)}
        provider={t.owner.provider}
        pay={(p, u) => payOnline({ ownerId: t.owner.id, tenantId: t.tenant.id, invoiceIds: picked.length ? picked : undefined, by: 'tenant', ...p }, u)}
        onDone={(r) => {
          toast.success('Payment successful', r.payment?.ref ? `Receipt ${r.payment.ref}` : '');
          if (r.payment) setTimeout(() => setReceipt({ ...r.payment, ownerId: r.payment.ownerId || t.owner.id }), 1200);
        }} />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
