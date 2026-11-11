import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, LogOut, FileText } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { PageHeader, Button, DataTable, Segmented, Modal, Field, Input, Select, toast, Badge } from '../../components/ui';
import { cycleLabel, leaseEnd, daysLeft, CYCLES } from '../../lib/billing';
import { money, fmtDate, today } from '../../lib/format';
import { NewLease, LeaseDocument } from '../shared/Lease';
import { Status } from '../shared/bits';

export default function Leases() {
  const { user } = useMe();
  const d = useData();
  const s = useStore();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('active');
  const [create, setCreate] = useState(false);
  const [doc, setDoc] = useState(null);
  const [renew, setRenew] = useState(null);
  const [end, setEnd] = useState(null);
  useEffect(() => { const id = params.get('id'); if (id && d.L[id]) { setDoc(d.L[id]); setParams({}, { replace: true }); } }, [params, d.L, setParams]);
  const rows = useMemo(() => d.leases.map((l) => ({ ...l, left: daysLeft(l), end: l.endedOn || leaseEnd(l) })).sort((a, b) => (a.status === b.status ? a.left - b.left : a.status === 'active' ? -1 : 1)), [d.leases]);
  const view = rows.filter((l) => (filter === 'active' ? l.status === 'active' : filter === 'expiring' ? l.status === 'active' && l.left <= 90 : filter === 'unsigned' ? l.status === 'active' && (!l.signedTenant || !l.signedOwner) : l.status === 'ended'));
  return (
    <div>
      <PageHeader title="Tenancies" subtitle="Agreements, renewals and move-outs" actions={<Button icon={Plus} onClick={() => setCreate(true)}>New tenancy</Button>} />
      <DataTable
        rows={view}
        onRowClick={setDoc}
        searchText={(l) => `${d.T[l.tenantId]?.name} ${d.U[l.unitId]?.label} ${l.no}`}
        toolbar={<Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Active' }, { value: 'expiring', label: 'Ending ≤ 90d' }, { value: 'unsigned', label: 'Unsigned' }, { value: 'ended', label: 'Ended' }]} />}
        columns={[
          { key: 'tenant', label: 'Tenant', sort: (l) => d.T[l.tenantId]?.name, render: (l) => <div><p className="font-semibold">{d.T[l.tenantId]?.name}</p><p className="font-mono text-[11px] text-slate-400">{l.no}</p></div> },
          { key: 'unit', label: 'Unit', sort: (l) => d.U[l.unitId]?.label, render: (l) => <div><p>{d.U[l.unitId]?.label}</p><p className="text-xs text-slate-500">{d.P[d.U[l.unitId]?.propertyId]?.name}</p></div> },
          { key: 'rent', label: 'Rent', hideOnMobile: true, render: (l) => <div><p className="font-semibold">{money(l.rent)}/mo</p><p className="text-xs text-slate-500">{cycleLabel(l.cycle).split(' (')[0]}</p></div> },
          { key: 'end', label: 'Ends', sort: (l) => l.end, render: (l) => <div><p>{fmtDate(l.end)}</p>{l.status === 'active' && l.start > today() && <p className="text-xs font-semibold text-brand-600">Renewal · starts {fmtDate(l.start)}</p>}{l.status === 'active' && l.start <= today() && <p className={`text-xs ${l.left <= 30 ? 'font-semibold text-red-600' : l.left <= 90 ? 'text-amber-600' : 'text-slate-500'}`}>{l.left < 0 ? `Expired ${-l.left} days ago` : `${l.left} days left`}{l.renewedBy ? ' · renewed' : ''}</p>}</div> },
          { key: 'sign', label: 'Signed', hideOnMobile: true, nosort: true, render: (l) => (l.signedTenant && l.signedOwner ? <Badge tone="green">Both</Badge> : <Badge tone="amber">{l.signedTenant ? 'Landlord pending' : 'Tenant pending'}</Badge>) },
          { key: 'status', label: 'Status', render: (l) => <Status s={l.status} /> },
          { key: 'act', label: '', nosort: true, render: (l) => l.status === 'active' && !l.renewedBy && (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="soft" icon={RefreshCw} onClick={() => setRenew(l)}>Renew</Button>
              <Button size="sm" variant="ghost" icon={LogOut} onClick={() => setEnd(l)} title="End tenancy" />
            </div>
          ) },
        ]}
      />
      <NewLease open={create} onClose={() => setCreate(false)} />
      {doc && <LeaseDocument lease={d.L[doc.id] || doc} onClose={() => setDoc(null)} signAs={user.role === 'owner' ? 'owner' : null} />}
      <RenewModal lease={renew} onClose={() => setRenew(null)} onSave={(v) => { s.renewLease(renew.id, v); setRenew(null); toast.success('Tenancy renewed', 'A new agreement was created for the tenant to sign'); }} />
      <Modal open={!!end} onClose={() => setEnd(null)} title="End tenancy" subtitle={end && `${d.T[end.tenantId]?.name} · ${d.U[end.unitId]?.label}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEnd(null)}>Cancel</Button><Button variant="danger" onClick={() => { s.endLease(end.id, { date: end.date || today(), refund: end.refund }); setEnd(null); toast.success('Tenancy ended', 'The unit is now vacant'); nav('/leases'); }}>End tenancy</Button></>}>
        <div className="space-y-4">
          <Field label="Move-out date"><Input type="date" value={end?.date || today()} onChange={(e) => setEnd({ ...end, date: e.target.value })} /></Field>
          <Field label="Deposit" hint={end && `Deposit held: ${money(end.deposit)}`}><Select value={end?.refund || ''} onChange={(e) => setEnd({ ...end, refund: e.target.value })} placeholder="Choose…" options={['Deposit refunded in full', 'Deposit part-refunded (damages)', 'Deposit kept against unpaid rent', 'No deposit']} /></Field>
          <p className="flex items-start gap-2 text-xs text-slate-500"><FileText className="mt-0.5 h-4 w-4 shrink-0" /> Unpaid bills due after the move-out date are cancelled. Earlier unpaid bills stay on the tenant’s record.</p>
        </div>
      </Modal>
    </div>
  );
}

function RenewModal({ lease, onClose, onSave }) {
  const [v, setV] = useState({});
  useEffect(() => { if (lease) setV({ months: lease.months, rent: lease.rent, cycle: lease.cycle }); }, [lease]);
  return (
    <Modal open={!!lease} onClose={onClose} title="Renew tenancy" subtitle={lease && `Starts ${fmtDate(leaseEnd(lease))}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(v)}>Renew</Button></>}>
      <div className="space-y-4">
        <Field label="New rent per month (GH₵)" hint={lease && `Currently ${money(lease.rent)}`}><Input type="number" value={v.rent || ''} onChange={(e) => setV({ ...v, rent: e.target.value })} /></Field>
        <Field label="Length"><Select value={v.months} onChange={(e) => setV({ ...v, months: Number(e.target.value) })} options={[6, 12, 18, 24, 36].map((m) => ({ value: m, label: `${m} months` }))} /></Field>
        <Field label="Pays"><Select value={v.cycle} onChange={(e) => setV({ ...v, cycle: e.target.value })} options={CYCLES} /></Field>
      </div>
    </Modal>
  );
}
