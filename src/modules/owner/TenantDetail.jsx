import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageSquare, Plus, FileSignature, Pencil, Receipt as ReceiptIcon, FilePlus2, Smartphone } from 'lucide-react';
import { SITE } from '../../config';
import { useStore, fillTemplate } from '../../data/store';
import { useMe, useData, useScoped, can } from '../../lib/session';
import { Button, Card, CardHeader, Avatar, KeyValue, DataTable, Tabs, Badge, FormModal, Modal, Textarea, toast, EmptyState } from '../../components/ui';
import { balance, cycleLabel, leaseEnd, daysLeft } from '../../lib/billing';
import { money, sum, fmtDate, fmtDateTime, today } from '../../lib/format';
import { InvStatus, Method, Status, Mini } from '../shared/bits';
import RecordPayment from '../shared/RecordPayment';
import ReceiptModal from '../shared/Receipt';
import { LeaseDocument } from '../shared/Lease';

const tenantFields = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'phone', label: 'Phone', required: true },
  { name: 'email', label: 'Email' },
  { name: 'ghanaCard', label: 'Ghana Card no.' },
  { name: 'occupation', label: 'Occupation / business' },
  { name: 'household', label: 'People in household', type: 'number' },
  { name: 'emergency', label: 'Emergency contact', span: 2 },
  { name: 'notes', label: 'Private notes', type: 'textarea' },
];
const billFields = [
  { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'utility', label: 'Utility (water, light, waste)' }, { value: 'other', label: 'Service charge / other' }, { value: 'rent', label: 'Rent adjustment' }], required: true },
  { name: 'title', label: 'Description', required: true, placeholder: 'e.g. Water bill Oct 2026' },
  { name: 'amount', label: 'Amount (GH₵)', type: 'number', required: true },
  { name: 'due', label: 'Due date', type: 'date', required: true },
];

export default function TenantDetail() {
  const { id } = useParams();
  const { user, owner } = useMe();
  const s = useStore();
  const d = useData();
  const jobs = useScoped('maintenance');
  const nav = useNavigate();
  const [tab, setTab] = useState('bills');
  const [pay, setPay] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [edit, setEdit] = useState(false);
  const [bill, setBill] = useState(false);
  const [doc, setDoc] = useState(null);
  const [sms, setSms] = useState(null);
  const t = d.T[id];
  const appUser = s.users.find((u) => u.tenantId === id);
  if (!t) return <EmptyState title="Tenant not found" action={<Button onClick={() => nav('/tenants')}>Back</Button>} />;
  const leases = d.leases.filter((l) => l.tenantId === id).sort((a, b) => b.start.localeCompare(a.start));
  const lease = leases.find((l) => l.status === 'active');
  const unit = d.U[lease?.unitId];
  const invs = d.invoices.filter((i) => i.tenantId === id && !i.void).sort((a, b) => b.due.localeCompare(a.due));
  const pays = d.payments.filter((p) => p.tenantId === id).sort((a, b) => b.at.localeCompare(a.at));
  const owed = sum(invs.filter((i) => i.due <= today()), balance);
  const upcoming = sum(invs.filter((i) => i.due > today()), balance);

  return (
    <div className="space-y-6">
      <Link to="/tenants" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Tenants</Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar name={t.name} size="xl" />
            <h1 className="mt-3 font-display text-2xl font-semibold">{t.name}</h1>
            <p className="text-sm text-slate-500">{t.occupation || 'Tenant'}</p>
            {lease ? <Badge tone="green" className="mt-2">{unit?.label} · {d.P[unit?.propertyId]?.name}</Badge> : <Badge className="mt-2">Former tenant</Badge>}
            <div className="mt-4 flex gap-2">
              <a href={`tel:${t.phone}`}><Button size="sm" variant="secondary" icon={Phone}>Call</Button></a>
              <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => setSms(fillTemplate(owner.settings.templates.reminder, { name: t.name.split(' ')[0], amount: money(owed || lease?.rent), unit: unit?.label || '', due: fmtDate(invs.find((i) => balance(i) > 0)?.due || today()), company: owner.company }))}>SMS</Button>
              {t.email && <a href={`mailto:${t.email}`}><Button size="sm" variant="secondary" icon={Mail}>Email</Button></a>}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-ivory-100 p-3 text-xs dark:bg-white/5">
            <span className="flex items-center gap-1.5 font-semibold"><Smartphone className="h-4 w-4 text-brand-600" /> {appUser ? 'Uses the tenant app' : 'Not on the app yet'}</span>
            {!appUser && lease && <Button size="sm" variant="soft" onClick={() => setSms(`Hello ${t.name.split(' ')[0]}, pay rent by MoMo, get receipts and report repairs in the ${owner.company} app: ${SITE} → Create account → Tenant. Use company code ${owner.code} and this phone number (${t.phone}).`)}>Invite</Button>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="Owes now" value={money(owed)} tone={owed > 0 ? 'text-red-600' : 'text-emerald-600'} />
            <Mini label="Coming up" value={money(upcoming)} />
          </div>
          <div className="mt-6"><KeyValue cols={1} items={[['Phone', t.phone], ['Email', t.email], ['Ghana Card', t.ghanaCard], ['Household', t.household ? `${t.household} people` : ''], ['Emergency contact', t.emergency], ['Notes', t.notes]]} /></div>
          {can(user, 'tenants') && <Button variant="ghost" size="sm" icon={Pencil} className="mt-4 w-full" onClick={() => setEdit(true)}>Edit details</Button>}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {lease && (
            <Card>
              <CardHeader title="Current tenancy" subtitle={lease.no} icon={FileSignature} action={<Button size="sm" variant="soft" onClick={() => setDoc(lease)}>Agreement</Button>} />
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                <Mini label="Rent / month" value={money(lease.rent)} />
                <Mini label="Pays" value={cycleLabel(lease.cycle).split(' (')[0]} />
                <Mini label="Started" value={fmtDate(lease.start)} />
                <Mini label="Ends" value={`${fmtDate(leaseEnd(lease))} (${daysLeft(lease)}d)`} tone={daysLeft(lease) < 60 ? 'text-amber-600' : undefined} />
              </div>
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                <Badge tone={lease.signedTenant ? 'green' : 'amber'}>{lease.signedTenant ? `Tenant signed ${fmtDate(lease.signedTenant.at)}` : 'Waiting for tenant to sign'}</Badge>
                <Badge tone={lease.signedOwner ? 'green' : 'amber'}>{lease.signedOwner ? 'Landlord signed' : 'Landlord not signed'}</Badge>
              </div>
            </Card>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'bills', label: 'Bills', count: invs.length }, { value: 'payments', label: 'Payments', count: pays.length }, { value: 'history', label: 'Tenancies', count: leases.length }, { value: 'repairs', label: 'Repairs' }]} />
            {can(user, 'payments') && lease && (
              <div className="flex gap-2"><Button size="sm" variant="secondary" icon={FilePlus2} onClick={() => setBill(true)}>Add bill</Button><Button size="sm" icon={Plus} onClick={() => setPay(true)}>Record payment</Button></div>
            )}
          </div>
          {tab === 'bills' && (
            <DataTable rows={invs} search={false} pageSize={8} columns={[
              { key: 'title', label: 'Bill', render: (i) => <div><p className="font-semibold">{i.title}</p><p className="text-xs capitalize text-slate-500">{i.kind}</p></div> },
              { key: 'due', label: 'Due', render: (i) => fmtDate(i.due) },
              { key: 'amount', label: 'Amount', render: (i) => money(i.amount) },
              { key: 'bal', label: 'Balance', sort: balance, render: (i) => <b className={balance(i) > 0 ? 'text-red-600' : ''}>{money(balance(i))}</b> },
              { key: 'st', label: 'Status', nosort: true, render: (i) => <InvStatus inv={i} /> },
            ]} />
          )}
          {tab === 'payments' && (
            <DataTable rows={pays} search={false} pageSize={8} onRowClick={setReceipt} columns={[
              { key: 'at', label: 'Date', render: (p) => fmtDateTime(p.at) },
              { key: 'method', label: 'Method', render: (p) => <Method m={p.method} /> },
              { key: 'ref', label: 'Receipt', hideOnMobile: true, render: (p) => <span className="font-mono text-xs">{p.ref}</span> },
              { key: 'amount', label: 'Amount', render: (p) => <b>{money(p.amount)}</b> },
              { key: 'r', label: '', nosort: true, render: () => <ReceiptIcon className="h-4 w-4 text-slate-400" /> },
            ]} />
          )}
          {tab === 'history' && (
            <DataTable rows={leases} search={false} onRowClick={setDoc} columns={[
              { key: 'no', label: 'Agreement', render: (l) => <span className="font-mono text-xs">{l.no}</span> },
              { key: 'unit', label: 'Unit', render: (l) => `${d.U[l.unitId]?.label || '—'} · ${d.P[d.U[l.unitId]?.propertyId]?.name || ''}` },
              { key: 'start', label: 'From', render: (l) => fmtDate(l.start) },
              { key: 'end', label: 'To', render: (l) => fmtDate(l.endedOn || leaseEnd(l)) },
              { key: 'status', label: 'Status', render: (l) => <Status s={l.status} /> },
            ]} />
          )}
          {tab === 'repairs' && (
            <DataTable rows={jobs.filter((j) => j.tenantId === id)} search={false} columns={[
              { key: 'title', label: 'Request' },
              { key: 'at', label: 'Reported', render: (j) => fmtDate(j.at) },
              { key: 'status', label: 'Status', render: (j) => <Status s={j.status} /> },
            ]} />
          )}
        </div>
      </div>
      <RecordPayment open={pay} tenantId={id} onClose={() => setPay(false)} onDone={setReceipt} />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
      {doc && <LeaseDocument lease={doc} onClose={() => setDoc(null)} signAs={user.role === 'owner' ? 'owner' : null} />}
      <FormModal open={edit} onClose={() => setEdit(false)} title="Edit tenant" fields={tenantFields} initial={t} onSubmit={(v) => { s.update('tenants', t.id, v); setEdit(false); toast.success('Saved'); }} />
      <FormModal open={bill} onClose={() => setBill(false)} title={`New bill for ${t.name}`} fields={billFields} initial={{ kind: 'utility', due: today() }} onSubmit={(v) => { s.addBill({ ...v, leaseId: lease.id }); setBill(false); toast.success('Bill added', 'The tenant can pay it in their app'); }} />
      <Modal open={sms != null} onClose={() => setSms(null)} title={`SMS to ${t.name}`} subtitle={t.phone} size="sm"
        footer={<Button icon={MessageSquare} onClick={() => { s.sendSms(owner.id, [{ phone: t.phone, name: t.name }], sms, 'custom'); setSms(null); toast.success('SMS sent'); }}>Send</Button>}>
        <Textarea value={sms || ''} onChange={(e) => setSms(e.target.value)} />
        <p className="mt-1 text-right text-xs text-slate-400">{(sms || '').length} characters · {Math.ceil((sms || '').length / 160)} SMS</p>
      </Modal>
    </div>
  );
}
