import { useMemo, useState } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, CheckCircle2, User } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData, useScoped } from '../../lib/session';
import { PageHeader, Button, Card, Badge, Segmented, FormModal, Modal, Field, Input, Select, Textarea, toast, EmptyState, StatCard, cx } from '../../components/ui';
import { money, fmtDate, fmtDateTime, nowISO } from '../../lib/format';
import { Status } from '../shared/bits';

export const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Roofing', 'Painting', 'Security', 'Appliances', 'Cleaning', 'Pest control', 'Other'];
const PRIORITY = { high: 'red', medium: 'amber', low: 'slate' };
const COLUMNS = [['open', 'New', AlertTriangle], ['assigned', 'Assigned', User], ['in progress', 'In progress', Clock], ['done', 'Done', CheckCircle2]];

export default function Maintenance() {
  const { user, owner } = useMe();
  const s = useStore();
  const d = useData();
  const jobs = useScoped('maintenance');
  const staff = s.users.filter((u) => u.ownerId === owner.id && u.role === 'manager');
  const [open, setOpen] = useState(null);
  const [add, setAdd] = useState(false);
  const [view, setView] = useState('board');
  const sorted = useMemo(() => [...jobs].sort((a, b) => b.at.localeCompare(a.at)), [jobs]);
  const job = open && jobs.find((j) => j.id === open);

  const Card_ = ({ j }) => (
    <button type="button" onClick={() => setOpen(j.id)} className="card block w-full p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold leading-snug">{j.title}</p><Badge tone={PRIORITY[j.priority]} className="capitalize">{j.priority}</Badge></div>
      <p className="mt-1 text-xs text-slate-500">{d.U[j.unitId]?.label} · {d.P[j.propertyId]?.name}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{j.category}</span><span>{fmtDate(j.at, 'dd MMM')}</span></div>
      {j.assignee && <p className="mt-2 truncate rounded-lg bg-ivory-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">→ {j.assignee}</p>}
    </button>
  );

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Repair requests from tenants and your own jobs" actions={<><Segmented value={view} onChange={setView} options={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }]} /><Button icon={Plus} onClick={() => setAdd(true)}>New job</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New" value={jobs.filter((j) => j.status === 'open').length} icon={AlertTriangle} tone="rose" />
        <StatCard label="In hand" value={jobs.filter((j) => ['assigned', 'in progress'].includes(j.status)).length} icon={Clock} tone="amber" />
        <StatCard label="Urgent open" value={jobs.filter((j) => j.priority === 'high' && j.status !== 'done').length} icon={Wrench} tone="red" />
        <StatCard label="Spent on repairs" value={money(jobs.reduce((a, j) => a + (Number(j.cost) || 0), 0))} icon={CheckCircle2} tone="green" />
      </div>
      {!jobs.length ? <Card><EmptyState icon={Wrench} title="No repair requests" text="When tenants report a problem in their app, it appears here." /></Card> : view === 'board' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map(([k, l, I]) => {
            const list = sorted.filter((j) => j.status === k);
            return (
              <div key={k} className="rounded-[var(--radius)] bg-ivory-200/50 p-3 dark:bg-white/[.03]">
                <p className="mb-3 flex items-center gap-2 px-1 text-sm font-bold"><I className="h-4 w-4 text-brand-600" />{l}<span className="ml-auto rounded-full bg-white px-2 text-xs dark:bg-white/10">{list.length}</span></p>
                <div className="space-y-3">{list.map((j) => <Card_ key={j.id} j={j} />)}{!list.length && <p className="py-6 text-center text-xs text-slate-400">Nothing here</p>}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="divide-y divide-ivory-200 dark:divide-white/5">
          {sorted.map((j) => (
            <button key={j.id} type="button" onClick={() => setOpen(j.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
              <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', j.priority === 'high' ? 'bg-red-500' : j.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300')} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{j.title}</p><p className="text-xs text-slate-500">{d.U[j.unitId]?.label} · {d.P[j.propertyId]?.name} · {d.T[j.tenantId]?.name || 'Owner job'}</p></div>
              <span className="hidden text-xs text-slate-400 sm:block">{fmtDate(j.at)}</span>
              <Status s={j.status} />
            </button>
          ))}
        </Card>
      )}

      {job && (
        <Modal open onClose={() => setOpen(null)} title={job.title} subtitle={`${d.U[job.unitId]?.label} · ${d.P[job.propertyId]?.name} · reported ${fmtDateTime(job.at)}`} size="lg"
          footer={<Button onClick={() => setOpen(null)}>Done</Button>}>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><Badge tone={PRIORITY[job.priority]} className="capitalize">{job.priority} priority</Badge><Badge>{job.category}</Badge>{d.T[job.tenantId] && <Badge tone="brand">{d.T[job.tenantId].name} · {d.T[job.tenantId].phone}</Badge>}</div>
            <p className="rounded-xl bg-ivory-100 p-4 text-sm dark:bg-white/5">{job.desc}</p>
            {job.photo && <img src={job.photo} alt="" className="max-h-64 rounded-xl" />}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status"><Select value={job.status} onChange={(e) => { s.update('maintenance', job.id, (j) => ({ status: e.target.value, updates: [...(j.updates || []), { at: nowISO(), by: user.name, text: `Status → ${e.target.value}` }] })); toast.success('Updated', 'The tenant sees this in their app'); }} options={COLUMNS.map(([v, l]) => ({ value: v, label: l }))} /></Field>
              <Field label="Assigned to"><Input list="assignees" value={job.assignee || ''} onChange={(e) => s.update('maintenance', job.id, { assignee: e.target.value, status: job.status === 'open' && e.target.value ? 'assigned' : job.status })} placeholder="Staff or artisan" /></Field>
              <Field label="Cost (GH₵)"><Input type="number" value={job.cost || ''} onChange={(e) => s.update('maintenance', job.id, { cost: Number(e.target.value) })} /></Field>
            </div>
            <datalist id="assignees">{staff.map((u) => <option key={u.id} value={u.name} />)}<option value="Mensah Plumbing Works" /><option value="Sparkle Electricals" /></datalist>
            <Notes job={job} />
          </div>
        </Modal>
      )}
      <FormModal open={add} onClose={() => setAdd(false)} title="New maintenance job" initial={{ priority: 'medium', category: 'Plumbing' }}
        fields={[
          { name: 'unitId', label: 'Unit', type: 'select', required: true, options: d.units.map((u) => ({ value: u.id, label: `${d.P[u.propertyId]?.name} · ${u.label}` })) },
          { name: 'title', label: 'What needs fixing?', required: true },
          { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
          { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
          { name: 'desc', label: 'Details', type: 'textarea' },
        ]}
        onSubmit={(v) => { const u = d.U[v.unitId]; const l = d.activeLease(u.id); s.add('maintenance', { ...v, ownerId: owner.id, propertyId: u.propertyId, tenantId: l?.tenantId || '', status: 'open', at: nowISO(), updates: [] }); setAdd(false); toast.success('Job added'); }} />
    </div>
  );
}

function Notes({ job }) {
  const { user } = useMe();
  const update = useStore((s) => s.update);
  const [text, setText] = useState('');
  return (
    <div>
      <span className="label">Updates</span>
      <div className="space-y-2">
        {(job.updates || []).map((u, i) => <div key={i} className="rounded-xl border border-ivory-200 p-3 text-sm dark:border-white/10"><p>{u.text}</p><p className="mt-1 text-[11px] text-slate-400">{u.by} · {fmtDateTime(u.at)}</p></div>)}
      </div>
      <div className="mt-2 flex gap-2">
        <Textarea className="!min-h-[44px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note the tenant can see…" />
        <Button disabled={!text.trim()} onClick={() => { update('maintenance', job.id, (j) => ({ updates: [...(j.updates || []), { at: nowISO(), by: user.name, text }] })); setText(''); }}>Add</Button>
      </div>
    </div>
  );
}
