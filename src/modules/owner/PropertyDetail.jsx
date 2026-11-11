import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Pencil, Trash2, Layers, UserPlus, Wrench, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData, useScoped, can } from '../../lib/session';
import { Button, Card, Badge, Tabs, DataTable, FormModal, Modal, Field, Input, Select, toast, confirmDialog, StatCard, EmptyState, KeyValue } from '../../components/ui';
import PropertyArt from '../../components/PropertyArt';
import { occupancy, arrearsTotal } from '../../lib/stats';
import { balance } from '../../lib/billing';
import { money, sum, fmtDate, fmtDateTime } from '../../lib/format';
import { propertyFields } from './Properties';
import { NewLease } from '../shared/Lease';
import { Method } from '../shared/bits';

const UNIT_KINDS = ['Single room', 'Chamber & hall', 'Chamber & hall S/C', 'Self-contained', '1-bedroom apartment', '2-bedroom apartment', '3-bedroom apartment', '2-bedroom S/C', '3-bedroom townhouse', '2-bedroom house', '3-bedroom house', '4-bedroom house', 'Penthouse', 'Hostel room (1 in 1)', 'Hostel room (2 in 1)', 'Hostel room (4 in 1)', 'Shop', 'Office', 'Kiosk', 'Warehouse', 'Store room'];
const unitFields = [
  { name: 'label', label: 'Unit name / number', required: true, placeholder: 'e.g. A1, Rm 3, Shop 2' },
  { name: 'kind', label: 'Unit type', type: 'select', options: UNIT_KINDS, required: true },
  { name: 'rent', label: 'Rent per month (GH₵)', type: 'number', required: true, hint: 'For a room let per bed, this is the rent for ONE bed' },
  { name: 'beds', label: 'Bedrooms / beds', type: 'number' },
  { name: 'perBed', label: 'Let per bed (shared room: each student rents one bed)', type: 'checkbox', span: 2 },
  { name: 'status', label: 'Status', type: 'select', options: [{ value: 'vacant', label: 'Vacant' }, { value: 'repair', label: 'Under repair' }], hidden: (v) => v.status === 'occupied' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];
const UNIT_TONE = { occupied: 'green', vacant: 'brand', repair: 'amber' };

export default function PropertyDetail() {
  const { id } = useParams();
  const { user, owner } = useMe();
  const s = useStore();
  const d = useData();
  const expenses = useScoped('expenses');
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('units');
  const [unitForm, setUnitForm] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [edit, setEdit] = useState(false);
  const [lease, setLease] = useState(null);
  const p = d.P[id];
  useEffect(() => { if (params.get('units')) { setBulk(true); setParams({}, { replace: true }); } }, [params, setParams]);
  const units = useMemo(() => d.units.filter((u) => u.propertyId === id).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })), [d.units, id]);
  if (!p) return <EmptyState title="Property not found" action={<Button onClick={() => nav('/properties')}>Back</Button>} />;
  const o = occupancy(units);
  const invs = d.invoices.filter((i) => i.propertyId === id);
  const pays = d.payments.filter((x) => x.propertyId === id).sort((a, b) => b.at.localeCompare(a.at));
  const exps = expenses.filter((e) => e.propertyId === id);
  const plan = s.platform.plans.find((x) => x.id === owner.plan);
  const allUnits = s.units.filter((u) => u.ownerId === owner.id).length;
  const room = plan.units - allUnits;
  const isOwner = user.role === 'owner';

  const saveUnit = (v) => {
    if (v.perBed && !(Number(v.beds) > 1)) return toast.error('How many beds?', 'A room let per bed needs 2 or more beds');
    if (v.id) s.update('units', v.id, { ...v, rent: Number(v.rent), beds: Number(v.beds) || 0, perBed: !!v.perBed });
    else {
      if (room <= 0) return toast.error('Plan limit reached', `Your ${plan.name} plan allows ${plan.units} units. Upgrade in Settings → Plan.`);
      s.add('units', { ...v, ownerId: owner.id, propertyId: id, rent: Number(v.rent), beds: Number(v.beds) || 0, perBed: !!v.perBed, taken: 0, status: v.status || 'vacant' });
    }
    toast.success('Unit saved');
    return setUnitForm(null);
  };
  const delUnit = async (u) => {
    if (u.status === 'occupied' || (u.taken || 0) > 0) return toast.error('End the tenancy first', 'This unit has a tenant.');
    if (await confirmDialog('Delete unit?', `${u.label} will be removed.`)) s.remove('units', u.id);
    return null;
  };

  return (
    <div className="space-y-6">
      <Link to="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Properties</Link>
      <Card className="overflow-hidden">
        <div className="relative h-44 sm:h-56">
          <PropertyArt property={p} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 text-white">
            <div>
              <Badge tone="slate" className="!bg-white/20 !text-white">{p.type}</Badge>
              <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{p.name}</h1>
              <p className="flex items-center gap-1 text-sm text-white/80"><MapPin className="h-4 w-4" />{p.address || p.area}, {p.city}{p.gps ? ` · ${p.gps}` : ''}</p>
            </div>
            {isOwner && <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEdit(true)}>Edit</Button>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Units" value={units.length} sub={`${o.vacant} vacant · ${o.repair} repair`} icon={Layers} tone="brand" />
        <StatCard label="Occupancy" value={`${o.pct}%`} sub={o.beds ? `${o.bedsTaken} of ${o.beds} beds taken` : `${o.occ} occupied`} icon={CheckCircle2} tone="green" />
        <StatCard label="Rent roll / month" value={money(sum(d.leases.filter((l) => l.status === 'active' && units.some((u) => u.id === l.unitId)), (l) => l.rent))} icon={MapPin} tone="gold" />
        <StatCard label="Arrears" value={money(arrearsTotal(invs))} icon={Wrench} tone="rose" />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'units', label: 'Units', count: units.length }, { value: 'payments', label: 'Payments', count: pays.length }, { value: 'expenses', label: 'Expenses', count: exps.length }, { value: 'info', label: 'Details' }]} />

      {tab === 'units' && (
        <DataTable
          rows={units}
          toolbar={isOwner && <><Button size="sm" variant="secondary" icon={Layers} onClick={() => setBulk(true)}>Add many</Button><Button size="sm" icon={Plus} onClick={() => setUnitForm({ kind: UNIT_KINDS[0], status: 'vacant' })}>Add unit</Button></>}
          empty={<EmptyState title="No units yet" text="Add rooms, flats or shops so you can move tenants in." action={isOwner && <Button icon={Layers} onClick={() => setBulk(true)}>Add units</Button>} />}
          columns={[
            { key: 'label', label: 'Unit', render: (u) => <div><p className="font-semibold">{u.label}</p><p className="text-xs text-slate-500">{u.kind}</p></div> },
            { key: 'rent', label: 'Rent / mo', render: (u) => <span>{money(u.rent)}{u.perBed && <span className="block text-[11px] text-slate-500">per bed</span>}</span> },
            { key: 'status', label: 'Status', render: (u) => (u.perBed ? <Badge tone={(u.taken || 0) >= u.beds ? 'green' : 'brand'} dot>{u.taken || 0} of {u.beds} beds</Badge> : <Badge tone={UNIT_TONE[u.status]} dot className="capitalize">{u.status === 'repair' ? 'Under repair' : u.status}</Badge>) },
            { key: 'tenant', label: 'Tenant', sort: (u) => d.T[d.activeLease(u.id)?.tenantId]?.name || '', render: (u) => {
              if (u.perBed) {
                const ls = d.leases.filter((l) => l.unitId === u.id && l.status === 'active').sort((a, b) => (a.bed || 0) - (b.bed || 0));
                return ls.length ? <div className="space-y-0.5">{ls.map((l) => <Link key={l.id} to={`/tenants/${l.tenantId}`} onClick={(e) => e.stopPropagation()} className="block text-sm font-medium text-brand-600 hover:underline">Bed {l.bed || '?'} · {d.T[l.tenantId]?.name}</Link>)}</div> : <span className="text-slate-400">—</span>;
              }
              const l = d.activeLease(u.id); const t = d.T[l?.tenantId];
              return t ? <Link to={`/tenants/${t.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-600 hover:underline">{t.name}</Link> : <span className="text-slate-400">—</span>;
            } },
            { key: 'owes', label: 'Balance', hideOnMobile: true, sort: (u) => sum(invs.filter((i) => i.unitId === u.id && !i.void), balance), render: (u) => { const b = sum(invs.filter((i) => i.unitId === u.id && !i.void && i.due <= new Date().toISOString().slice(0, 10)), balance); return b > 0 ? <span className="font-semibold text-red-600">{money(b)}</span> : <span className="text-emerald-600">Clear</span>; } },
            { key: 'act', label: '', nosort: true, render: (u) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {u.status === 'vacant' && can(user, 'tenants') && <Button size="sm" variant="soft" icon={UserPlus} onClick={() => setLease(u.id)}>{u.perBed ? 'Let a bed' : 'Let'}</Button>}
                {isOwner && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setUnitForm(u)} />}
                {isOwner && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => delUnit(u)} />}
              </div>
            ) },
          ]}
        />
      )}
      {tab === 'payments' && (
        <DataTable rows={pays} columns={[
          { key: 'at', label: 'Date', render: (x) => fmtDateTime(x.at) },
          { key: 'tenant', label: 'Tenant', render: (x) => d.T[x.tenantId]?.name },
          { key: 'unit', label: 'Unit', render: (x) => d.U[x.unitId]?.label },
          { key: 'method', label: 'Method', render: (x) => <Method m={x.method} /> },
          { key: 'amount', label: 'Amount', render: (x) => <b>{money(x.amount)}</b> },
        ]} />
      )}
      {tab === 'expenses' && (
        <DataTable rows={exps} columns={[
          { key: 'date', label: 'Date', render: (x) => fmtDate(x.date) },
          { key: 'category', label: 'Category' },
          { key: 'note', label: 'Note', hideOnMobile: true },
          { key: 'amount', label: 'Amount', render: (x) => <b>{money(x.amount)}</b> },
        ]} />
      )}
      {tab === 'info' && (
        <Card className="space-y-5 p-6">
          <KeyValue items={[['Type', p.type], ['City', p.city], ['Area', p.area], ['Ghana Post GPS', p.gps], ['Address', p.address], ['Added', fmtDate(p.createdAt)]]} cols={3} />
          <div><span className="label">Amenities</span><div className="flex flex-wrap gap-2">{(p.amenities || []).map((a) => <Badge key={a} tone="brand">{a}</Badge>)}{!p.amenities?.length && <span className="text-sm text-slate-400">None listed</span>}</div></div>
          {isOwner && <Button variant="soft-red" icon={Trash2} onClick={async () => { if (units.some((u) => u.status === 'occupied')) return toast.error('This property still has tenants'); if (await confirmDialog('Delete property?', 'The property and its units will be removed.')) { units.forEach((u) => s.remove('units', u.id)); s.remove('properties', p.id); nav('/properties'); } return null; }}>Delete property</Button>}
        </Card>
      )}

      <FormModal open={!!unitForm} onClose={() => setUnitForm(null)} title={unitForm?.id ? `Edit ${unitForm.label}` : 'Add unit'} fields={unitFields} initial={unitForm} onSubmit={saveUnit} />
      <FormModal open={edit} onClose={() => setEdit(false)} title="Edit property" fields={propertyFields} initial={{ ...p, amenitiesText: (p.amenities || []).join(', ') }} onSubmit={(v) => { s.update('properties', p.id, { ...v, amenities: (v.amenitiesText || '').split(',').map((x) => x.trim()).filter(Boolean) }); setEdit(false); toast.success('Saved'); }} />
      <BulkUnits open={bulk} onClose={() => setBulk(false)} room={room} plan={plan} onSave={(list) => { list.forEach((u) => s.add('units', { ...u, ownerId: owner.id, propertyId: id, status: 'vacant' })); setBulk(false); toast.success(`${list.length} units added`); }} />
      <NewLease open={!!lease} unitId={lease} onClose={() => setLease(null)} />
    </div>
  );
}

function BulkUnits({ open, onClose, onSave, room, plan }) {
  const [v, setV] = useState({ prefix: 'Rm ', from: 1, to: 6, kind: 'Chamber & hall', rent: 800, perBed: false, beds: 2 });
  const list = [];
  for (let i = Number(v.from); i <= Number(v.to) && list.length < 200; i++) list.push({ label: `${v.prefix}${i}`, kind: v.kind, rent: Number(v.rent), beds: v.perBed ? Number(v.beds) || 2 : 1, perBed: !!v.perBed, taken: 0 });
  const over = list.length > room;
  return (
    <Modal open={open} onClose={onClose} title="Add many units at once" subtitle="e.g. Rm 1 to Rm 10, all the same type and rent — edit any of them later" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!list.length || over} onClick={() => onSave(list)}>Add {list.length} units</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Name starts with"><Input value={v.prefix} onChange={(e) => setV({ ...v, prefix: e.target.value })} /></Field>
        <Field label="From no."><Input type="number" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} /></Field>
        <Field label="To no."><Input type="number" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} /></Field>
        <Field label="Type" className="col-span-2"><Select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} options={UNIT_KINDS} /></Field>
        <Field label={v.perBed ? 'Rent / bed / mo' : 'Rent / mo'}><Input type="number" value={v.rent} onChange={(e) => setV({ ...v, rent: e.target.value })} /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={v.perBed} onChange={(e) => setV({ ...v, perBed: e.target.checked })} /> Let per bed (shared rooms)</label>
        {v.perBed && <Field label="Beds per room"><Input type="number" min={2} value={v.beds} onChange={(e) => setV({ ...v, beds: e.target.value })} /></Field>}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">{list.slice(0, 30).map((u) => <Badge key={u.label} tone="brand">{u.label}</Badge>)}{list.length > 30 && <Badge>+{list.length - 30} more</Badge>}</div>
      {over && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Your {plan.name} plan has room for {Math.max(0, room)} more units. Upgrade in Settings → Plan.</p>}
    </Modal>
  );
}
