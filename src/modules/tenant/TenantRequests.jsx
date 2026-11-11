import { useState } from 'react';
import { Plus, Camera, Wrench } from 'lucide-react';
import { useStore } from '../../data/store';
import { Card, PageHeader, Button, Modal, Field, Input, Select, Textarea, toast, EmptyState, Badge, cx } from '../../components/ui';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { Status } from '../shared/bits';
import { readImage } from '../shared/BrandEditor';
import { CATEGORIES } from '../owner/Maintenance';
import { useTenant } from './useTenant';

const STEPS = ['open', 'assigned', 'in progress', 'done'];

export default function TenantRequests() {
  const t = useTenant();
  const reportRepair = useStore((s) => s.reportRepair);
  const [form, setForm] = useState(null);
  const [view, setView] = useState(null);
  const submit = () => {
    if (!form.title) return toast.error('Tell us what is wrong');
    Promise.resolve(reportRepair({ ...form, ownerId: t.owner.id, unitId: t.unit.id, tenantId: t.tenant.id }))
      .then(() => { toast.success('Request sent', `${t.owner.company} has been notified`); setForm(null); })
      .catch((e) => toast.error('Not sent', e.message));
    return null;
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Repairs" subtitle="Report a problem and follow its progress" actions={<Button icon={Plus} onClick={() => setForm({ category: 'Plumbing', priority: 'medium' })}>Report a problem</Button>} />
      {t.requests.length ? t.requests.map((r) => (
        <Card key={r.id} className="cursor-pointer p-5" onClick={() => setView(r)}>
          <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{r.title}</p><p className="text-xs text-slate-500">{r.category} · {fmtDate(r.at)}</p></div><Status s={r.status} /></div>
          <div className="mt-4 flex gap-1">{STEPS.map((st, i) => <div key={st} className={cx('h-1.5 flex-1 rounded-full', i <= STEPS.indexOf(r.status) ? 'bg-brand-600' : 'bg-ivory-200 dark:bg-white/10')} />)}</div>
          {r.assignee && <p className="mt-2 text-xs text-slate-500">Handled by {r.assignee}</p>}
        </Card>
      )) : <Card><EmptyState icon={Wrench} title="No repair requests" text="Something broken? Report it here and your landlord is notified straight away." /></Card>}

      <Modal open={!!form} onClose={() => setForm(null)} title="Report a problem" subtitle={`${t.unit?.label} · ${t.property?.name}`} footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={submit}>Send request</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="What’s wrong?"><Input autoFocus value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Kitchen sink is leaking" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} /></Field>
              <Field label="How urgent?"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={[{ value: 'low', label: 'Can wait' }, { value: 'medium', label: 'Soon' }, { value: 'high', label: 'Urgent' }]} /></Field>
            </div>
            <Field label="Details"><Textarea value={form.desc || ''} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="When did it start? Where exactly?" /></Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-ivory-300 p-4 text-sm dark:border-white/10">
              {form.photo ? <img src={form.photo} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <Camera className="h-6 w-6 text-slate-400" />}
              <span>{form.photo ? 'Change photo' : 'Add a photo (optional)'}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { try { setForm({ ...form, photo: await readImage(e.target.files[0], 800) }); } catch (err) { toast.error(err.message); } }} />
            </label>
          </div>
        )}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title} subtitle={view && `Reported ${fmtDateTime(view.at)}`}>
        {view && (
          <div className="space-y-4">
            <div className="flex gap-2"><Status s={view.status} /><Badge>{view.category}</Badge></div>
            {view.desc && <p className="text-sm">{view.desc}</p>}
            {view.photo && <img src={view.photo} alt="" className="max-h-60 rounded-xl" />}
            <div className="space-y-2">{(t.requests.find((r) => r.id === view.id)?.updates || []).map((u, i) => <div key={i} className="rounded-xl bg-ivory-100 p-3 text-sm dark:bg-white/5"><p>{u.text}</p><p className="mt-1 text-[11px] text-slate-400">{u.by} · {fmtDateTime(u.at)}</p></div>)}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
