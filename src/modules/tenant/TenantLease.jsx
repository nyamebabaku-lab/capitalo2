import { useState } from 'react';
import { FileSignature, PenLine, CheckCircle2, Phone, Mail } from 'lucide-react';
import { Card, PageHeader, Button, KeyValue, Badge } from '../../components/ui';
import { CompanyLogo } from '../../components/layout/Logo';
import { money, fmtDate } from '../../lib/format';
import { leaseEnd, daysLeft, cycleLabel } from '../../lib/billing';
import { LeaseDocument } from '../shared/Lease';
import { useTenant } from './useTenant';

export default function TenantLease() {
  const t = useTenant();
  const [doc, setDoc] = useState(null);
  if (!t.lease) return <PageHeader title="My tenancy" subtitle="No tenancy yet" />;
  return (
    <div className="space-y-5">
      <PageHeader title="My tenancy" subtitle={t.lease.no} />
      <Card className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white"><FileSignature className="h-5 w-5" /></span>
          <div className="flex-1"><p className="font-bold">{t.unit.label} · {t.property.name}</p><p className="text-xs text-slate-500">{t.unit.kind}</p></div>
          {t.lease.signedTenant ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Signed</Badge> : <Badge tone="amber">Not signed</Badge>}
        </div>
        <KeyValue items={[['Rent', `${money(t.lease.rent)} / month`], ['Billing', cycleLabel(t.lease.cycle)], ['Start', fmtDate(t.lease.start)], ['End', `${fmtDate(leaseEnd(t.lease))} (${daysLeft(t.lease)} days)`], ['Security deposit', money(t.lease.deposit)], ['Address', `${t.property.address}, ${t.property.city}`]]} />
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDoc(t.lease)}>Read agreement</Button>
          {!t.lease.signedTenant && <Button icon={PenLine} onClick={() => setDoc(t.lease)}>Sign agreement</Button>}
        </div>
      </Card>
      <Card className="p-5">
        <p className="label">Your landlord</p>
        <div className="flex items-center gap-3">
          <CompanyLogo owner={t.owner} />
          <div className="flex-1"><p className="font-bold">{t.owner.company}</p><p className="text-xs text-slate-500">{t.owner.address}</p></div>
        </div>
        <div className="mt-4 flex gap-2"><a href={`tel:${t.owner.phone}`}><Button size="sm" variant="secondary" icon={Phone}>{t.owner.phone}</Button></a><a href={`mailto:${t.owner.email}`}><Button size="sm" variant="secondary" icon={Mail}>Email</Button></a></div>
      </Card>
      {t.leases.length > 1 && (
        <Card className="p-5">
          <p className="label">Earlier agreements</p>
          {t.leases.filter((l) => l.id !== t.lease.id).map((l) => <button key={l.id} type="button" onClick={() => setDoc(l)} className="flex w-full justify-between border-t border-ivory-200 py-2.5 text-sm first:border-0 dark:border-white/5"><span className="font-mono text-xs">{l.no}</span><span>{fmtDate(l.start)}</span></button>)}
        </Card>
      )}
      {doc && <LeaseDocument lease={t.leases.find((l) => l.id === doc.id) || doc} onClose={() => setDoc(null)} signAs={doc.id === t.lease.id ? 'tenant' : null} />}
    </div>
  );
}
