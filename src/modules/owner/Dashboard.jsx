import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, ComposedChart } from 'recharts';
import { Banknote, Home, AlertTriangle, TrendingUp, Plus, UserPlus, Building2, Send, ArrowUpRight, Wallet as WalletIcon, Wrench, CalendarClock, ChevronRight } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData, useScoped, can } from '../../lib/session';
import { StatCard, Card, CardHeader, Button, Avatar, Progress, EmptyState, toast } from '../../components/ui';
import { monthly, arrearsTotal, debtors, expiring, occupancy, thisMonth } from '../../lib/stats';
import { money, moneyShort, fmtDate, sum, fmtDateTime } from '../../lib/format';
import { Method } from '../shared/bits';
import RecordPayment from '../shared/RecordPayment';
import { NewLease } from '../shared/Lease';
import ReceiptModal from '../shared/Receipt';
import { fillTemplate } from '../../data/store';
import { heroPhoto } from '../../components/PropertyArt';

export default function Dashboard() {
  const { user, owner } = useMe();
  const s = useStore();
  const d = useData();
  const maintenance = useScoped('maintenance');
  const nav = useNavigate();
  const [pay, setPay] = useState(false);
  const [lease, setLease] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const series = useMemo(() => monthly(d.payments, d.invoices, 12), [d.payments, d.invoices]);
  const m = thisMonth();
  const collected = sum(d.payments.filter((p) => p.at.startsWith(m)), (p) => p.amount);
  const billed = sum(d.invoices.filter((i) => !i.void && i.due.startsWith(m)), (i) => i.amount);
  const arrears = arrearsTotal(d.invoices);
  const occ = occupancy(d.units);
  const owing = debtors(d.invoices, d.T, d.U);
  const exp = expiring(d.leases, 60);
  const openJobs = maintenance.filter((x) => x.status !== 'done');
  const w = user.role === 'owner' ? { month: sum(d.payments.filter((p) => p.online && p.at.startsWith(m)), (p) => p.amount) } : null;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const remind = () => {
    const recips = owing.map((x) => ({ phone: x.tenant.phone, name: x.tenant.name, text: fillTemplate(owner.settings.templates.overdue, { name: x.tenant.name.split(' ')[0], amount: money(x.owed), unit: x.unit?.label, company: owner.company }) }));
    s.sendSms(owner.id, recips, '', 'overdue');
    toast.success(`Reminders sent to ${recips.length} tenants`, 'See Messages for the delivery log');
  };

  if (user.role === 'owner' && !d.units.length) return <GettingStarted />;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{fmtDate(new Date(), 'EEEE, d MMMM yyyy')}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{greet}, {user.name.split(' ')[0]} 👋</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user, 'payments') && <Button icon={Plus} onClick={() => setPay(true)}>Record payment</Button>}
          {can(user, 'tenants') && <Button variant="secondary" icon={UserPlus} onClick={() => setLease(true)}>New tenancy</Button>}
          {user.role === 'owner' && <Button variant="secondary" icon={Building2} onClick={() => nav('/properties?new=1')} className="hidden sm:inline-flex">Add property</Button>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {w ? (
          <div className="relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-lift lg:col-span-1">
            <img src={heroPhoto(owner)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="relative">
              <div className="flex items-center justify-between"><p className="text-sm text-white/70">Paid online this month</p><WalletIcon className="h-5 w-5 text-accent-300" /></div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight">{money(w.month)}</p>
              <p className="mt-1 text-xs text-white/70">MoMo & card through {owner.provider === 'hubtel' ? 'Hubtel' : 'Paystack'} — paid straight into your account</p>
              <div className="mt-5 flex gap-2">
                <Button className="!bg-accent-400 !text-brand-950 hover:!bg-accent-300" icon={ArrowUpRight} onClick={() => nav('/rent?tab=payments')}>Payments</Button>
                <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={() => nav('/reports')}>Reports</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-lift">
            <p className="text-sm text-white/70">You manage</p>
            <p className="mt-2 text-3xl font-extrabold">{d.properties.length} properties</p>
            <p className="mt-1 text-sm text-white/70">{d.properties.map((p) => p.name).join(' · ')}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Collected this month" value={moneyShort(collected)} icon={Banknote} tone="green" sub={billed ? `of ${moneyShort(billed)} billed` : 'nothing billed yet'} />
          <StatCard label="Arrears" value={moneyShort(arrears)} icon={AlertTriangle} tone="rose" sub={`${owing.length} tenants owing`} onClick={() => nav('/rent?tab=arrears')} />
          <StatCard label="Occupancy" value={`${occ.pct}%`} icon={Home} tone="brand" sub={`${occ.occ}/${occ.total} units · ${occ.vacant} vacant`} onClick={() => nav('/properties')} />
          <StatCard label="12-month income" value={moneyShort(sum(series, (x) => x.collected))} icon={TrendingUp} tone="gold" sub="rent, deposits & bills" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Rent collected vs billed" subtitle="Last 12 months" icon={TrendingUp} />
          <div className="h-72 px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(120 113 108 / .15)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={40} />
                <Tooltip formatter={(v, n) => [money(v), n === 'collected' ? 'Collected' : 'Billed']} labelFormatter={(l, p) => p?.[0]?.payload?.label} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.12)', fontSize: 12 }} />
                <Bar dataKey="collected" fill="rgb(var(--brand-600))" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Line dataKey="billed" stroke="rgb(var(--accent-500))" strokeWidth={2.5} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Occupancy by property" icon={Building2} />
          <div className="space-y-4 p-5">
            {d.properties.map((p) => {
              const o = occupancy(d.units.filter((u) => u.propertyId === p.id));
              return (
                <button key={p.id} type="button" onClick={() => nav(`/properties/${p.id}`)} className="block w-full text-left">
                  <div className="mb-1.5 flex justify-between text-sm"><span className="truncate font-semibold">{p.name}</span><span className="text-slate-500">{o.occ}/{o.total}</span></div>
                  <Progress value={o.pct} tone={o.pct >= 90 ? 'green' : o.pct >= 70 ? 'brand' : 'amber'} />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Who owes rent" subtitle={money(arrears)} icon={AlertTriangle} action={owing.length > 0 && <Button size="sm" variant="soft" icon={Send} onClick={remind}>Remind all</Button>} />
          <div className="divide-y divide-ivory-200 px-2 pb-2 dark:divide-white/5">
            {owing.slice(0, 6).map((x) => (
              <button key={x.tenant.id} type="button" onClick={() => nav(`/tenants/${x.tenant.id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
                <Avatar name={x.tenant.name} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{x.tenant.name}</p><p className="text-xs text-slate-500">{x.unit?.label} · {x.days} days late</p></div>
                <p className="text-sm font-bold text-red-600">{money(x.owed)}</p>
              </button>
            ))}
            {!owing.length && <EmptyState title="No arrears 🎉" text="Every tenant is up to date." />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent payments" icon={Banknote} action={<Button size="sm" variant="ghost" onClick={() => nav('/rent?tab=payments')}>All <ChevronRight className="h-4 w-4" /></Button>} />
          <div className="divide-y divide-ivory-200 px-2 pb-2 dark:divide-white/5">
            {[...d.payments].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((p) => (
              <button key={p.id} type="button" onClick={() => setReceipt(p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
                <Method m={p.method} compact />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{d.T[p.tenantId]?.name}</p><p className="text-xs text-slate-500">{fmtDateTime(p.at)}</p></div>
                <p className="text-sm font-bold text-emerald-600">+{money(p.amount)}</p>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Tenancies ending soon" subtitle="Next 60 days" icon={CalendarClock} />
            <div className="divide-y divide-ivory-200 px-2 pb-2 dark:divide-white/5">
              {exp.slice(0, 4).map((l) => (
                <button key={l.id} type="button" onClick={() => nav(`/leases?id=${l.id}`)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ivory-100 dark:hover:bg-white/5">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{d.T[l.tenantId]?.name}</p><p className="text-xs text-slate-500">{d.U[l.unitId]?.label} · ends {fmtDate(l.end)}</p></div>
                  <span className={`chip ${l.left < 14 ? 'bg-red-50 text-red-700 dark:bg-red-500/10' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10'}`}>{l.left}d</span>
                </button>
              ))}
              {!exp.length && <p className="px-3 py-6 text-center text-sm text-slate-500">None in the next 60 days.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <button type="button" onClick={() => nav('/maintenance')} className="flex w-full items-center gap-4 text-left">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30"><Wrench className="h-5 w-5" /></span>
              <div className="flex-1"><p className="text-2xl font-extrabold">{openJobs.length}</p><p className="text-xs text-slate-500">open repair requests · {openJobs.filter((x) => x.priority === 'high').length} urgent</p></div>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </button>
          </Card>
        </div>
      </div>
      <RecordPayment open={pay} onClose={() => setPay(false)} onDone={setReceipt} />
      <NewLease open={lease} onClose={() => setLease(false)} />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function GettingStarted() {
  const { user, owner } = useMe();
  const s = useStore();
  const nav = useNavigate();
  const props = s.properties.filter((p) => p.ownerId === owner.id);
  const steps = [
    { done: !!owner.frontImage || owner.theme?.brand !== '#0b7a4f', title: 'Check your branding', text: 'Logo, colours and front picture (optional)', to: '/settings' },
    { done: props.length > 0, title: 'Add your first property', text: 'A building, compound or plaza', to: '/properties?new=1' },
    { done: s.units.some((u) => u.ownerId === owner.id), title: 'Add its units', text: 'Rooms, flats, shops or offices', to: props[0] ? `/properties/${props[0].id}?units=1` : '/properties?new=1' },
    { done: s.leases.some((l) => l.ownerId === owner.id), title: 'Move in a tenant', text: 'Set rent terms — the first bill is raised for you', to: '/leases' },
    { done: !s.platform.testMode, title: 'Connect payments', text: 'Paystack or Hubtel keys, then switch test mode off', to: '/settings' },
    { done: s.users.some((u) => u.ownerId === owner.id && u.role === 'manager') || s.invites.some((i) => i.ownerId === owner.id), title: 'Invite your staff', text: 'Managers and caretakers get an SMS invite', to: '/staff' },
  ];
  const next = steps.find((x) => !x.done);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">Welcome to Capital O2 Estates</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Let’s get {owner.company} running, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">{steps.filter((x) => x.done).length} of {steps.length} done</p>
        <Progress value={(steps.filter((x) => x.done).length / steps.length) * 100} className="mt-3" />
      </div>
      <Card className="divide-y divide-ivory-200 dark:divide-white/5">
        {steps.map((x, i) => (
          <button key={x.title} type="button" disabled={x.done} onClick={() => nav(x.to)} className="flex w-full items-center gap-4 p-5 text-left transition enabled:hover:bg-ivory-100 dark:enabled:hover:bg-white/5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${x.done ? 'bg-emerald-500 text-white' : x === next ? 'bg-brand-600 text-white' : 'bg-ivory-200 text-slate-500 dark:bg-white/10'}`}>{x.done ? '✓' : i + 1}</span>
            <div className="flex-1"><p className={`font-semibold ${x.done ? 'text-slate-400 line-through' : ''}`}>{x.title}</p><p className="text-xs text-slate-500">{x.text}</p></div>
            {!x.done && <ChevronRight className="h-5 w-5 text-slate-300" />}
          </button>
        ))}
      </Card>
      {next && <Button size="lg" className="w-full" onClick={() => nav(next.to)}>{next.title}</Button>}
    </div>
  );
}
