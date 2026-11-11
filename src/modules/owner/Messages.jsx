import { useMemo, useState } from 'react';
import { Send, Megaphone, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useStore, fillTemplate } from '../../data/store';
import { useMe, useData, useScoped } from '../../lib/session';
import { PageHeader, Button, Card, CardHeader, Tabs, Field, Select, Textarea, DataTable, FormModal, toast, Badge, confirmDialog, EmptyState } from '../../components/ui';
import { debtors, expiring } from '../../lib/stats';
import { money, fmtDateTime, fmtDate, nowISO } from '../../lib/format';

export default function Messages() {
  const { owner, user } = useMe();
  const s = useStore();
  const d = useData();
  const log = useScoped('sms');
  const notices = useScoped('notices');
  const [tab, setTab] = useState('sms');
  const [to, setTo] = useState('all');
  const [tpl, setTpl] = useState('custom');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(false);

  const current = useMemo(() => d.leases.filter((l) => l.status === 'active').map((l) => ({ tenant: d.T[l.tenantId], unit: d.U[l.unitId], lease: l })).filter((x) => x.tenant), [d]);
  const owing = debtors(d.invoices, d.T, d.U);
  const ending = expiring(d.leases, 60);
  const recipients = useMemo(() => {
    if (to === 'all') return current;
    if (to === 'owing') return owing.map((x) => ({ ...x, owed: x.owed }));
    if (to === 'ending') return ending.map((l) => ({ tenant: d.T[l.tenantId], unit: d.U[l.unitId], lease: l, end: l.end }));
    return current.filter((x) => x.unit?.propertyId === to);
  }, [to, current, owing, ending, d]);
  const preview = (x) => fillTemplate(text, { name: x.tenant.name.split(' ')[0], amount: money(x.owed ?? x.lease?.rent ?? 0), unit: x.unit?.label, due: fmtDate(x.end || new Date()), company: owner.company, ref: '' });
  const send = () => {
    if (!text.trim() || !recipients.length) return toast.error('Write a message and choose who gets it');
    s.sendSms(owner.id, recipients.map((x) => ({ phone: x.tenant.phone, name: x.tenant.name, text: preview(x) })), '', tpl);
    toast.success(`SMS sent to ${recipients.length} tenant${recipients.length > 1 ? 's' : ''}`, `Sender ID: ${owner.settings.smsSender || 'CAPO2'}`);
    return setText('');
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="SMS your tenants and post notices to their app" />
      <Tabs value={tab} onChange={setTab} className="mb-5" tabs={[{ value: 'sms', label: 'SMS', icon: MessageSquare }, { value: 'notices', label: 'Notices', icon: Megaphone, count: notices.length }]} />
      {tab === 'sms' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader title="Send an SMS" subtitle={`Sender ID: ${owner.settings.smsSender || 'CAPO2'}`} icon={Send} />
            <div className="space-y-4 p-5">
              <Field label="Send to">
                <Select value={to} onChange={(e) => setTo(e.target.value)} options={[{ value: 'all', label: `All current tenants (${current.length})` }, { value: 'owing', label: `Tenants owing rent (${owing.length})` }, { value: 'ending', label: `Tenancies ending in 60 days (${ending.length})` }, ...d.properties.map((p) => ({ value: p.id, label: `Everyone at ${p.name}` }))]} />
              </Field>
              <Field label="Template">
                <Select value={tpl} onChange={(e) => { setTpl(e.target.value); if (e.target.value !== 'custom') setText(owner.settings.templates[e.target.value]); }} options={[{ value: 'custom', label: 'Write my own' }, { value: 'reminder', label: 'Rent reminder' }, { value: 'overdue', label: 'Overdue notice' }, { value: 'expiry', label: 'Tenancy ending' }]} />
              </Field>
              <Field label="Message" hint="Use {name}, {amount}, {unit}, {due}, {company} — filled in for each tenant">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" />
              </Field>
              <div className="flex items-center justify-between text-xs text-slate-500"><span>{text.length} chars · {Math.max(1, Math.ceil(text.length / 160))} SMS each</span><span>{recipients.length} recipients</span></div>
              {recipients[0] && text && <div className="rounded-2xl rounded-bl-sm bg-brand-600 p-3 text-sm text-white">{preview(recipients[0])}</div>}
              <Button className="w-full" icon={Send} onClick={send}>Send to {recipients.length}</Button>
            </div>
          </Card>
          <DataTable rows={log} pageSize={10} searchText={(m) => `${m.name} ${m.to} ${m.text}`} columns={[
            { key: 'at', label: 'Sent', render: (m) => fmtDateTime(m.at) },
            { key: 'name', label: 'To', render: (m) => <div><p className="font-semibold">{m.name}</p><p className="text-xs text-slate-500">{m.to}</p></div> },
            { key: 'text', label: 'Message', className: '!whitespace-normal min-w-[220px]', render: (m) => <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{m.text}</p> },
            { key: 'status', label: '', render: (m) => <Badge tone="green">{m.status}</Badge> },
          ]} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end"><Button icon={Plus} onClick={() => setNotice(true)}>Post notice</Button></div>
          {notices.length ? [...notices].sort((a, b) => b.at.localeCompare(a.at)).map((n) => (
            <Card key={n.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.propertyId ? d.P[n.propertyId]?.name : 'All properties'} · {fmtDateTime(n.at)}</p>
                </div>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={async () => (await confirmDialog('Delete notice?', n.title)) && s.remove('notices', n.id)} />
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
            </Card>
          )) : <Card><EmptyState icon={Megaphone} title="No notices yet" text="Notices show on your tenants’ home screen." /></Card>}
        </div>
      )}
      <FormModal open={notice} onClose={() => setNotice(false)} title="Post a notice" initial={{ propertyId: '', sms: true }}
        fields={[
          { name: 'propertyId', label: 'For', type: 'select', placeholder: 'All properties', options: d.properties.map((p) => ({ value: p.id, label: p.name })) },
          { name: 'title', label: 'Title', required: true },
          { name: 'body', label: 'Message', type: 'textarea', required: true },
          { name: 'sms', label: 'Also send by SMS', type: 'checkbox' },
        ]}
        onSubmit={(v) => {
          s.add('notices', { ownerId: owner.id, propertyId: v.propertyId, title: v.title, body: v.body, at: nowISO(), by: user.name });
          if (v.sms) {
            const list = current.filter((x) => !v.propertyId || x.unit?.propertyId === v.propertyId);
            s.sendSms(owner.id, list.map((x) => ({ phone: x.tenant.phone, name: x.tenant.name })), `${v.title}: ${v.body} – ${owner.company}`, 'notice');
          }
          setNotice(false);
          toast.success('Notice posted');
        }} />
    </div>
  );
}
