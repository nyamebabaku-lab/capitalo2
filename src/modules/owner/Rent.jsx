import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Download, Send, RefreshCw, Receipt as ReceiptIcon, AlertTriangle, Banknote, CalendarClock, Smartphone } from 'lucide-react';
import { useStore, fillTemplate } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { PageHeader, Button, DataTable, Tabs, Segmented, StatCard, Avatar, toast, Select } from '../../components/ui';
import { balance, invoiceStatus, METHOD_LABEL } from '../../lib/billing';
import { debtors, thisMonth } from '../../lib/stats';
import { money, sum, fmtDate, fmtDateTime, downloadCSV, today } from '../../lib/format';
import { InvStatus, Method } from '../shared/bits';
import RecordPayment from '../shared/RecordPayment';
import ReceiptModal from '../shared/Receipt';

export default function Rent() {
  const { owner } = useMe();
  const s = useStore();
  const d = useData();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'bills');
  const [status, setStatus] = useState('open');
  const [prop, setProp] = useState('');
  const [pay, setPay] = useState(null);
  const [receipt, setReceipt] = useState(null);
  useEffect(() => { const r = params.get('receipt'); if (r) { setReceipt(s.payments.find((p) => p.id === r)); setTab('payments'); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = thisMonth();
  const inv = useMemo(() => d.invoices.filter((i) => !i.void && (!prop || i.propertyId === prop)).sort((a, b) => b.due.localeCompare(a.due)), [d.invoices, prop]);
  const pays = useMemo(() => d.payments.filter((p) => !prop || p.propertyId === prop).sort((a, b) => b.at.localeCompare(a.at)), [d.payments, prop]);
  const owing = debtors(inv, d.T, d.U);
  const bills = inv.filter((i) => { const st = invoiceStatus(i); return status === 'open' ? st !== 'paid' : status === 'all' ? true : st === status; });

  const remind = (list) => {
    const recips = list.map((x) => ({ phone: x.tenant.phone, name: x.tenant.name, text: fillTemplate(owner.settings.templates.overdue, { name: x.tenant.name.split(' ')[0], amount: money(x.owed), unit: x.unit?.label, company: owner.company }) }));
    s.sendSms(owner.id, recips, '', 'overdue');
    toast.success(`Reminder sent to ${recips.length} tenant${recips.length > 1 ? 's' : ''}`);
  };
  const runBilling = () => { const n = s.runBilling(); toast.success(n ? `${n} new bills raised` : 'All bills are up to date', 'Bills are raised 14 days before each rent period'); };

  return (
    <div>
      <PageHeader title="Rent & Bills" subtitle="Bills raised automatically from each tenancy · part-payments allowed"
        actions={<><Button variant="secondary" icon={RefreshCw} onClick={runBilling}>Run billing</Button><Button icon={Plus} onClick={() => setPay({})}>Record payment</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Collected this month" value={money(sum(pays.filter((p) => p.at.startsWith(m)), (p) => p.amount))} icon={Banknote} tone="green" />
        <StatCard label="Online (MoMo/card)" value={money(sum(pays.filter((p) => p.at.startsWith(m) && p.online), (p) => p.amount))} icon={Smartphone} tone="brand" sub="goes to your wallet" />
        <StatCard label="Overdue" value={money(sum(owing, (x) => x.owed))} icon={AlertTriangle} tone="rose" sub={`${owing.length} tenants`} />
        <StatCard label="Due in 30 days" value={money(sum(inv.filter((i) => i.due > today() && i.due <= fmtDate(new Date(Date.now() + 30 * 864e5), 'yyyy-MM-dd')), balance))} icon={CalendarClock} tone="gold" />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'bills', label: 'Bills' }, { value: 'payments', label: 'Payments', count: pays.length }, { value: 'arrears', label: 'Arrears', count: owing.length }]} />
        <Select className="w-full sm:w-56" value={prop} onChange={(e) => setProp(e.target.value)} placeholder="All properties" options={d.properties.map((p) => ({ value: p.id, label: p.name }))} />
      </div>

      {tab === 'bills' && (
        <DataTable rows={bills} searchText={(i) => `${d.T[i.tenantId]?.name} ${d.U[i.unitId]?.label} ${i.title}`}
          toolbar={<Segmented value={status} onChange={setStatus} options={[{ value: 'open', label: 'Unpaid' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' }]} />}
          columns={[
            { key: 'tenant', label: 'Tenant', sort: (i) => d.T[i.tenantId]?.name, render: (i) => <div><p className="font-semibold">{d.T[i.tenantId]?.name}</p><p className="text-xs text-slate-500">{d.U[i.unitId]?.label} · {d.P[i.propertyId]?.name}</p></div> },
            { key: 'title', label: 'Bill', hideOnMobile: true },
            { key: 'due', label: 'Due', render: (i) => fmtDate(i.due) },
            { key: 'amount', label: 'Amount', hideOnMobile: true, render: (i) => money(i.amount) },
            { key: 'bal', label: 'Balance', sort: balance, render: (i) => <b className={balance(i) > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{money(balance(i))}</b> },
            { key: 'st', label: 'Status', sort: invoiceStatus, render: (i) => <InvStatus inv={i} /> },
            { key: 'a', label: '', nosort: true, render: (i) => balance(i) > 0 && <Button size="sm" variant="soft" onClick={(e) => { e.stopPropagation(); setPay({ tenantId: i.tenantId }); }}>Receive</Button> },
          ]} />
      )}
      {tab === 'payments' && (
        <DataTable rows={pays} onRowClick={setReceipt} searchText={(p) => `${d.T[p.tenantId]?.name} ${p.ref} ${METHOD_LABEL[p.method]}`}
          toolbar={<Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCSV('payments', pays.map((p) => ({ Date: fmtDateTime(p.at), Receipt: p.ref, Tenant: d.T[p.tenantId]?.name, Unit: d.U[p.unitId]?.label, Property: d.P[p.propertyId]?.name, Method: METHOD_LABEL[p.method], Amount: p.amount, Fee: p.fee, Net: p.net, 'Recorded by': p.by })))}>Export</Button>}
          columns={[
            { key: 'at', label: 'Date', render: (p) => fmtDateTime(p.at) },
            { key: 'tenant', label: 'Tenant', sort: (p) => d.T[p.tenantId]?.name, render: (p) => <div><p className="font-semibold">{d.T[p.tenantId]?.name}</p><p className="text-xs text-slate-500">{d.U[p.unitId]?.label}</p></div> },
            { key: 'method', label: 'Method', render: (p) => <Method m={p.method} /> },
            { key: 'ref', label: 'Receipt', hideOnMobile: true, render: (p) => <span className="font-mono text-xs">{p.ref}</span> },
            { key: 'amount', label: 'Amount', render: (p) => <b className="text-emerald-600">{money(p.amount)}</b> },
            { key: 'r', label: '', nosort: true, render: () => <ReceiptIcon className="h-4 w-4 text-slate-400" /> },
          ]} />
      )}
      {tab === 'arrears' && (
        <DataTable rows={owing.map((x) => ({ ...x, id: x.tenant.id }))} searchText={(x) => x.tenant.name}
          toolbar={owing.length > 0 && <Button size="sm" icon={Send} onClick={() => remind(owing)}>SMS all {owing.length}</Button>}
          onRowClick={(x) => nav(`/tenants/${x.tenant.id}`)}
          columns={[
            { key: 'tenant', label: 'Tenant', sort: (x) => x.tenant.name, render: (x) => <div className="flex items-center gap-3"><Avatar name={x.tenant.name} size="sm" /><div><p className="font-semibold">{x.tenant.name}</p><p className="text-xs text-slate-500">{x.tenant.phone}</p></div></div> },
            { key: 'unit', label: 'Unit', render: (x) => `${x.unit?.label} · ${d.P[x.unit?.propertyId]?.name}` },
            { key: 'days', label: 'Days late', render: (x) => <span className={x.days > 30 ? 'font-bold text-red-600' : 'font-semibold text-amber-600'}>{x.days}</span> },
            { key: 'owed', label: 'Owes', render: (x) => <b className="text-red-600">{money(x.owed)}</b> },
            { key: 'a', label: '', nosort: true, render: (x) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><Button size="sm" variant="ghost" icon={Send} onClick={() => remind([x])}>Remind</Button><Button size="sm" variant="soft" onClick={() => setPay({ tenantId: x.tenant.id })}>Receive</Button></div> },
          ]} />
      )}
      <RecordPayment open={!!pay} tenantId={pay?.tenantId} onClose={() => setPay(null)} onDone={setReceipt} />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
