import { useMemo, useState } from 'react';
import { LIVE, SITE, APKS } from '../../config';
import { transferOwner } from '../../data/live';
import { Crown } from 'lucide-react';
import { UserPlus, Pencil, Trash2, Building2, Check, X, Send } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { PageHeader, Button, Card, Avatar, Badge, Modal, Field, Input, Select, toast, confirmDialog, EmptyState, cx } from '../../components/ui';

const PERMS = [['payments', 'Record payments & bills'], ['tenants', 'Add tenants & tenancies'], ['maintenance', 'Handle repairs'], ['expenses', 'Record expenses'], ['reports', 'See reports']];
const ROLES = ['Property Manager', 'Caretaker', 'Accountant', 'Agent'];

export default function Staff() {
  const { owner } = useMe();
  const s = useStore();
  const { properties, P } = useData();
  const staff = s.users.filter((u) => u.ownerId === owner.id && u.role === 'manager');
  const allInvites = useStore((st) => st.invites);
  const invites = useMemo(() => allInvites.filter((i) => i.ownerId === owner.id && !i.accepted), [allInvites, owner.id]);
  const inviteText = (f) => `Hello ${f.name.split(' ')[0]}, ${owner.company} has added you as ${f.title}. Install the Capital O2 Estates app (${APKS.manager.url}) or open ${SITE} → Create account → I work for Capital O2, and use this phone number.`;
  const [form, setForm] = useState(null);
  const save = () => {
    if (!form.name || !form.phone) return toast.error('Name and phone are needed');
    if (!form.propertyIds?.length) return toast.error('Give them at least one property');
    if (form.id) s.update('users', form.id, form);
    else if (LIVE) {
      s.add('invites', { ...form, ownerId: owner.id });
      s.sendSms(owner.id, [{ phone: form.phone, name: form.name }], inviteText(form), 'invite');
      toast.success('Invite sent by SMS', `${form.name} signs up with code ${owner.code} and this phone number`);
    } else { s.add('users', { ...form, role: 'manager', ownerId: owner.id }); toast.success('Invite sent', `${form.name} gets an SMS with a link to sign in`); }
    return setForm(null);
  };
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k]?.includes(v) ? f[k].filter((x) => x !== v) : [...(f[k] || []), v] }));
  return (
    <div>
      <PageHeader title="Staff" subtitle="Managers and caretakers see only the properties you give them" actions={<Button icon={UserPlus} onClick={() => setForm({ title: 'Property Manager', propertyIds: [], perms: { payments: true, tenants: true, maintenance: true, expenses: false, reports: false } })}>Invite staff</Button>} />
      {invites.length > 0 && (
        <div className="mb-4 space-y-2">
          {invites.map((i) => (
            <Card key={i.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={i.name} size="sm" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{i.name} <Badge tone="amber">Invited</Badge></p><p className="text-xs text-slate-500">{i.title} · {i.phone} · joins with code <b className="font-mono">{owner.code}</b></p></div>
              <Button size="sm" variant="ghost" icon={Send} onClick={() => { s.sendSms(owner.id, [{ phone: i.phone, name: i.name }], inviteText(i), 'invite'); toast.success('Invite sent again'); }}>Resend</Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => s.remove('invites', i.id)} />
            </Card>
          ))}
        </div>
      )}
      {staff.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {staff.map((u) => (
            <Card key={u.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={u.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.title} · {u.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{u.propertyIds?.map((id) => <Badge key={id} tone="brand"><Building2 className="h-3 w-3" />{P[id]?.name}</Badge>)}</div>
                  <div className="mt-3 grid grid-cols-2 gap-1">{PERMS.map(([k, l]) => <p key={k} className={cx('flex items-center gap-1.5 text-xs', u.perms?.[k] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through')}>{u.perms?.[k] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5" />}{l}</p>)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(u)} />
                  {LIVE && <Button size="sm" variant="ghost" icon={Crown} title="Make owner" onClick={async () => { if (await confirmDialog('Hand over ownership?', `${u.name} becomes the owner (settings, staff, payments). You stay on as a manager with access to every property.`, { danger: false, confirmLabel: 'Hand over' })) { try { await transferOwner(u.id); toast.success('Ownership handed over'); } catch (e) { toast.error('Not done', e.message); } } }} />}
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={async () => (await confirmDialog('Remove staff member?', `${u.name} will lose access straight away.`)) && s.remove('users', u.id)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !invites.length && <Card><EmptyState title="No staff yet" text="Invite a manager or caretaker to help collect rent and handle repairs." /></Card>}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit staff member' : 'Invite staff'} size="lg" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? 'Save' : 'Send invite'}</Button></>}>
        {form && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone"><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email"><Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Role"><Select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} options={ROLES} /></Field>
            </div>
            <div><span className="label">Properties they manage</span><div className="flex flex-wrap gap-2">{properties.map((p) => <button key={p.id} type="button" onClick={() => toggle('propertyIds', p.id)} className={cx('rounded-full px-3 py-1.5 text-xs font-semibold ring-1', form.propertyIds?.includes(p.id) ? 'bg-brand-600 text-white ring-brand-600' : 'ring-ivory-300 dark:ring-white/10')}>{p.name}</button>)}</div></div>
            <div><span className="label">What they can do</span><div className="grid gap-2 sm:grid-cols-2">{PERMS.map(([k, l]) => <label key={k} className="flex items-center gap-3 rounded-xl border border-ivory-200 p-3 text-sm dark:border-white/10"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!form.perms?.[k]} onChange={(e) => setForm({ ...form, perms: { ...form.perms, [k]: e.target.checked } })} />{l}</label>)}</div></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
