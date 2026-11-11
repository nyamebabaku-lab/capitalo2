// Owner/staff record a payment (cash, bank, cheque, MoMo paid directly) or charge the tenant's MoMo now.
import { useEffect, useMemo, useState } from 'react';
import { Smartphone, CheckSquare, Square } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { Modal, Button, Field, Input, Select, toast, cx } from '../../components/ui';
import PayModal from '../../components/PayModal';
import { payOnline } from '../../lib/pay';
import { balance } from '../../lib/billing';
import { money, round2, sum, fmtDate } from '../../lib/format';
import { InvStatus } from './bits';

export default function RecordPayment({ open, onClose, tenantId: initialTenant, onDone }) {
  const { user, owner } = useMe();
  const { tenants, invoices, U, P, leases } = useData();
  const recordPayment = useStore((s) => s.recordPayment);
  const [tenantId, setTenantId] = useState('');
  const [picked, setPicked] = useState([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [momo, setMomo] = useState(false);

  const activeTenants = useMemo(() => tenants.filter((t) => leases.some((l) => l.tenantId === t.id && l.status === 'active')).sort((a, b) => a.name.localeCompare(b.name)), [tenants, leases]);
  const open_ = useMemo(() => invoices.filter((i) => i.tenantId === tenantId && !i.void && balance(i) > 0).sort((a, b) => a.due.localeCompare(b.due)), [invoices, tenantId]);
  useEffect(() => { if (open) { setTenantId(initialTenant || ''); setMethod('cash'); setNote(''); } }, [open, initialTenant]);
  useEffect(() => { setPicked(open_.map((i) => i.id)); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = round2(sum(open_.filter((i) => picked.includes(i.id)), balance));
  useEffect(() => setAmount(due || ''), [due]);
  const tenant = tenants.find((t) => t.id === tenantId);

  const [busy, setBusy] = useState(false);
  const save = async () => {
    const amt = Number(amount);
    if (!tenantId || !(amt > 0)) return toast.error('Choose a tenant and amount');
    setBusy(true);
    try {
      const p = await recordPayment({ ownerId: owner.id, tenantId, amount: amt, method, invoiceIds: picked, by: user.name, note });
      toast.success('Payment recorded', `${money(amt)} from ${tenant.name} · receipt sent by SMS`);
      onClose();
      onDone?.(p);
    } catch (e) { toast.error('Payment not saved', e.message); }
    setBusy(false);
    return null;
  };

  return (
    <>
      <Modal open={open && !momo} onClose={onClose} title="Record a payment" subtitle="Cash, bank or MoMo paid to you directly — or send a MoMo prompt to the tenant now" size="lg"
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="soft" icon={Smartphone} disabled={!tenantId || owner.status !== 'approved'} onClick={() => setMomo(true)}>Charge tenant’s MoMo</Button><Button disabled={busy} onClick={save}>Save payment</Button></>}>
        <div className="space-y-4">
          <Field label="Tenant">
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Choose tenant…" options={activeTenants.map((t) => {
              const l = leases.find((x) => x.tenantId === t.id && x.status === 'active');
              const owed = sum(invoices.filter((i) => i.tenantId === t.id && balance(i) > 0 && !i.void), balance);
              return { value: t.id, label: `${t.name} — ${U[l?.unitId]?.label}, ${P[U[l?.unitId]?.propertyId]?.name}${owed ? ` · owes ${money(owed)}` : ''}` };
            })} />
          </Field>
          {tenantId && (
            <div>
              <span className="label">What is it for?</span>
              {open_.length ? (
                <div className="divide-y divide-ivory-200 rounded-xl border border-ivory-200 dark:divide-white/5 dark:border-white/10">
                  {open_.map((i) => {
                    const on = picked.includes(i.id);
                    return (
                      <button key={i.id} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== i.id) : [...picked, i.id])} className="flex w-full items-center gap-3 p-3 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
                        {on ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{i.title}</span><span className="text-xs text-slate-500">Due {fmtDate(i.due)}{i.paid ? ` · ${money(i.paid)} paid` : ''}</span></span>
                        <InvStatus inv={i} />
                        <span className="w-24 text-right text-sm font-bold">{money(balance(i))}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Nothing owed right now — anything you record will be kept as credit for the next bill.</p>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received (GH₵)" hint={due ? `Selected bills total ${money(due)} · less is a part-payment` : undefined}><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-bold" /></Field>
            <Field label="How was it paid?">
              <div className="grid grid-cols-2 gap-2">
                {[['cash', 'Cash'], ['bank', 'Bank deposit'], ['momo_direct', 'MoMo to me'], ['cheque', 'Cheque']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setMethod(v)} className={cx('rounded-xl border px-3 py-2 text-xs font-semibold', method === v ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'border-ivory-200 dark:border-white/10')}>{l}</button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid at the office, bank slip no. 12345" /></Field>
          <p className="text-xs text-slate-500">Record money you received in cash, at the bank or by MoMo directly. Tenants who pay in the app by MoMo or card are recorded automatically.</p>
        </div>
      </Modal>
      <PayModal open={momo} onClose={() => { setMomo(false); onClose(); }} title={`Charge ${tenant?.name || ''}`} subtitle="The tenant gets a MoMo prompt on their phone" amount={amount} max={undefined} phone={tenant?.phone || ''} payee={owner.company}
        provider={owner.provider}
        pay={(p, u) => payOnline({ ownerId: owner.id, tenantId, invoiceIds: picked, by: user.name, ...p }, u)}
        onDone={(r) => { toast.success('Payment received', `${tenant?.name} paid by MoMo`); if (r.payment) onDone?.({ ...r.payment, ownerId: owner.id }); }} />
    </>
  );
}
