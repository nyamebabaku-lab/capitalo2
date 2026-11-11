import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wrench, FileSignature, History, Megaphone, ChevronRight, MapPin, CalendarDays, PenLine, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import PropertyArt, { heroPhoto } from '../../components/PropertyArt';
import { CompanyLogo } from '../../components/layout/Logo';
import { money, fmtDate, fmtDateTime, daysBetween, today } from '../../lib/format';
import { leaseEnd, daysLeft, cycleLabel } from '../../lib/billing';
import { Status, Method } from '../shared/bits';
import { useTenant } from './useTenant';
import { LeaseDocument } from '../shared/Lease';

export default function TenantHome() {
  const t = useTenant();
  const nav = useNavigate();
  const [doc, setDoc] = useState(false);
  const next = t.upcoming[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="space-y-5">
      <div className="relative -mx-4 -mt-6 h-44 overflow-hidden sm:mx-0 sm:rounded-[var(--radius)]">
        <img src={heroPhoto(t.owner)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-900/50 to-transparent" />
        <div className="absolute bottom-4 left-5 text-white">
          <p className="text-sm text-white/80">{greet},</p>
          <h1 className="font-display text-2xl font-semibold">{t.tenant.name.split(' ')[0]} 👋</h1>
          <p className="text-xs italic text-white/70">{t.owner.tagline}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-lift">
        <div className="kente-soft absolute inset-0" />
        <div className="relative">
          {t.dueNow > 0 ? (
            <>
              <p className="text-sm text-white/75">Amount due now</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">{money(t.dueNow)}</p>
              <p className="mt-1 text-xs text-white/70">Oldest bill was due {fmtDate(t.open[0].due)} ({daysBetween(t.open[0].due, today())} days ago)</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-sm text-white/75"><CheckCircle2 className="h-4 w-4 text-accent-300" /> You’re all paid up</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">{next ? money(next.amount) : money(0)}</p>
              <p className="mt-1 text-xs text-white/70">{next ? `Next: ${next.title} · due ${fmtDate(next.due)}` : 'No upcoming bills'}</p>
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="!bg-accent-400 !text-brand-950 hover:!bg-accent-300" icon={CreditCard} onClick={() => nav('/pay')}>{t.dueNow > 0 ? 'Pay now' : 'Pay in advance'}</Button>
            <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => nav('/history')}>Receipts</Button>
          </div>
        </div>
      </div>

      {t.lease && !t.lease.signedTenant && (
        <button type="button" onClick={() => setDoc(true)} className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-500/20 dark:bg-amber-500/10">
          <PenLine className="h-5 w-5 text-amber-600" />
          <div className="flex-1"><p className="text-sm font-bold text-amber-900 dark:text-amber-200">Please sign your tenancy agreement</p><p className="text-xs text-amber-700 dark:text-amber-300">Read it and sign with your finger — it takes a minute.</p></div>
          <ChevronRight className="h-5 w-5 text-amber-500" />
        </button>
      )}

      <div className="grid grid-cols-4 gap-2">
        {[[CreditCard, 'Pay', '/pay'], [Wrench, 'Repair', '/requests'], [FileSignature, 'Tenancy', '/lease'], [History, 'Receipts', '/history']].map(([I, l, to]) => (
          <button key={l} type="button" onClick={() => nav(to)} className="card flex flex-col items-center gap-2 p-3 text-xs font-semibold transition hover:-translate-y-0.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><I className="h-5 w-5" /></span>{l}
          </button>
        ))}
      </div>

      {t.unit && (
        <Card className="overflow-hidden">
          <div className="h-28"><PropertyArt property={t.property} /></div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-display text-lg font-semibold">{t.unit.label} · {t.property.name}</p><p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {t.property.address}, {t.property.city}</p></div>
              <CompanyLogo owner={t.owner} size="sm" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-ivory-100 p-2.5 dark:bg-white/5"><p className="text-sm font-extrabold">{money(t.lease.rent)}</p><p className="text-[10px] uppercase text-slate-400">per month</p></div>
              <div className="rounded-xl bg-ivory-100 p-2.5 dark:bg-white/5"><p className="text-sm font-extrabold">{cycleLabel(t.lease.cycle).split(' (')[0]}</p><p className="text-[10px] uppercase text-slate-400">billing</p></div>
              <div className="rounded-xl bg-ivory-100 p-2.5 dark:bg-white/5"><p className="text-sm font-extrabold">{daysLeft(t.lease)}d</p><p className="text-[10px] uppercase text-slate-400">left</p></div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Tenancy {fmtDate(t.lease.start)} – {fmtDate(leaseEnd(t.lease))}</p>
          </div>
        </Card>
      )}

      {t.requests.filter((r) => r.status !== 'done').length > 0 && (
        <Card className="p-5">
          <p className="mb-3 flex items-center gap-2 font-bold"><Wrench className="h-4 w-4 text-brand-600" /> Your repair requests</p>
          {t.requests.filter((r) => r.status !== 'done').map((r) => <button key={r.id} type="button" onClick={() => nav('/requests')} className="flex w-full items-center justify-between gap-3 border-t border-ivory-200 py-2.5 text-left first:border-0 dark:border-white/5"><span className="text-sm">{r.title}</span><Status s={r.status} /></button>)}
        </Card>
      )}

      {t.notices.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 font-bold"><Megaphone className="h-4 w-4 text-brand-600" /> Notices</p><Button size="sm" variant="ghost" onClick={() => nav('/notices')}>All</Button></div>
          {t.notices.slice(0, 2).map((n) => <div key={n.id} className="border-t border-ivory-200 py-3 first:border-0 first:pt-0 dark:border-white/5"><p className="text-sm font-semibold">{n.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p><p className="mt-1 text-[11px] text-slate-400">{fmtDate(n.at)}</p></div>)}
        </Card>
      )}

      {t.payments[0] && (
        <Card className="p-5">
          <p className="mb-3 font-bold">Last payment</p>
          <div className="flex items-center gap-3"><Method m={t.payments[0].method} /><span className="flex-1 text-xs text-slate-500">{fmtDateTime(t.payments[0].at)}</span><b className="text-emerald-600">{money(t.payments[0].amount)}</b></div>
        </Card>
      )}
      {doc && <LeaseDocument lease={t.lease} onClose={() => setDoc(false)} signAs="tenant" />}
      <p className="pb-2 text-center text-[11px] text-slate-400"><Badge>{t.owner.company}</Badge> · {t.owner.phone}</p>
    </div>
  );
}
