import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, FileDown, TrendingUp, PiggyBank, Scale, Percent } from 'lucide-react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { useMe, useData, useScoped } from '../../lib/session';
import { PageHeader, Button, Card, CardHeader, Segmented, StatCard, printElement } from '../../components/ui';
import { CompanyLogo } from '../../components/layout/Logo';
import { balance, METHOD_LABEL } from '../../lib/billing';
import { arrearsOf, occupancy } from '../../lib/stats';
import { money, sum, downloadCSV, fmtDate, groupBy, pct, daysBetween, today } from '../../lib/format';

const COLORS = ['rgb(var(--brand-600))', 'rgb(var(--accent-500))', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

export default function Reports() {
  const { owner } = useMe();
  const d = useData();
  const expenses = useScoped('expenses');
  const [months, setMonths] = useState(6);
  const from = format(startOfMonth(addMonths(new Date(), -(months - 1))), 'yyyy-MM-dd');
  const pays = d.payments.filter((p) => p.at.slice(0, 10) >= from);
  const exps = expenses.filter((e) => e.date >= from);

  const series = useMemo(() => Array.from({ length: months }, (_, i) => {
    const k = format(addMonths(startOfMonth(new Date()), i - months + 1), 'yyyy-MM');
    return { month: format(new Date(`${k}-01`), 'MMM'), income: sum(pays.filter((p) => p.at.startsWith(k)), (p) => p.amount), expenses: sum(exps.filter((e) => e.date.startsWith(k)), (e) => e.amount) };
  }), [pays, exps, months]);

  const perProperty = d.properties.map((p) => {
    const income = sum(pays.filter((x) => x.propertyId === p.id), (x) => x.amount);
    const cost = sum(exps.filter((x) => x.propertyId === p.id), (x) => x.amount);
    const fees = sum(pays.filter((x) => x.propertyId === p.id), (x) => x.fee);
    const o = occupancy(d.units.filter((u) => u.propertyId === p.id));
    const arr = sum(arrearsOf(d.invoices.filter((i) => i.propertyId === p.id)), balance);
    return { name: p.name, income, cost, fees, net: income - cost - fees, occ: o.pct, units: o.total, arrears: arr };
  });
  const income = sum(perProperty, (x) => x.income);
  const cost = sum(perProperty, (x) => x.cost);
  const fees = sum(perProperty, (x) => x.fees);
  const billed = sum(d.invoices.filter((i) => !i.void && i.due >= from && i.due <= today()), (i) => i.amount);
  const collectedOfBilled = sum(d.invoices.filter((i) => !i.void && i.due >= from && i.due <= today()), (i) => i.paid);
  const aging = [['0–30 days', 0, 30], ['31–60 days', 31, 60], ['61–90 days', 61, 90], ['90+ days', 91, 99999]].map(([label, a, b]) => ({ label, value: sum(arrearsOf(d.invoices).filter((i) => { const n = daysBetween(i.due, today()); return n >= a && n <= b; }), balance) }));
  const mix = Object.entries(groupBy(pays, (p) => p.method)).map(([m, l]) => ({ name: METHOD_LABEL[m] || m, value: sum(l, (p) => p.amount) })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title="Reports" subtitle={`${fmtDate(from)} – ${fmtDate(new Date())}`}
        actions={<><Segmented value={months} onChange={setMonths} options={[{ value: 1, label: '1M' }, { value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }]} /><Button variant="secondary" icon={Download} onClick={() => downloadCSV('property-report', perProperty.map((x) => ({ Property: x.name, Units: x.units, 'Occupancy %': x.occ, Income: x.income, Expenses: x.cost, 'Platform fees': x.fees, Net: x.net, Arrears: x.arrears })))}>Excel</Button><Button variant="secondary" icon={FileDown} onClick={() => printElement('report', `${owner.company} report`)}>PDF</Button></>} />
      <div id="report" className="space-y-6">
        <div data-pdf className="hidden items-center gap-3 print:flex"><CompanyLogo owner={owner} /><div><p className="font-display text-xl font-semibold">{owner.company} — Income report</p><p className="text-xs">{fmtDate(from)} – {fmtDate(new Date())}</p></div></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Income" value={money(income)} icon={TrendingUp} tone="green" />
          <StatCard label="Expenses + fees" value={money(cost + fees)} icon={PiggyBank} tone="rose" />
          <StatCard label="Net profit" value={money(income - cost - fees)} icon={Scale} tone="brand" />
          <StatCard label="Collection rate" value={`${pct(collectedOfBilled, billed)}%`} sub="of bills due in period" icon={Percent} tone="gold" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Income vs expenses" />
            <div className="h-72 p-3">
              <ResponsiveContainer>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(120 113 108 / .15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="rgb(var(--brand-600))" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Expenses" fill="rgb(var(--accent-500))" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardHeader title="How tenants pay" />
            <div className="h-48"><ResponsiveContainer><PieChart><Pie data={mix} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>{mix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => money(v)} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-1.5 px-5 pb-5">{mix.map((m, i) => <div key={m.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="flex-1">{m.name}</span><b>{pct(m.value, income)}%</b></div>)}</div>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <CardHeader title="Profit by property" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ivory-100/80 dark:bg-white/[.03]"><tr>{['Property', 'Units', 'Occupied', 'Income', 'Expenses', 'Fees', 'Net', 'Arrears'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-ivory-200 dark:divide-white/5">
                {perProperty.map((x) => <tr key={x.name}><td className="td font-semibold">{x.name}</td><td className="td">{x.units}</td><td className="td">{x.occ}%</td><td className="td">{money(x.income)}</td><td className="td">{money(x.cost)}</td><td className="td">{money(x.fees)}</td><td className="td font-bold text-emerald-600">{money(x.net)}</td><td className="td text-red-600">{money(x.arrears)}</td></tr>)}
              </tbody>
              <tfoot className="border-t-2 border-ivory-300 font-bold dark:border-white/10"><tr><td className="td">Total</td><td className="td">{d.units.length}</td><td className="td">{occupancy(d.units).pct}%</td><td className="td">{money(income)}</td><td className="td">{money(cost)}</td><td className="td">{money(fees)}</td><td className="td text-emerald-600">{money(income - cost - fees)}</td><td className="td text-red-600">{money(sum(perProperty, (x) => x.arrears))}</td></tr></tfoot>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Arrears by age" subtitle="How long unpaid bills have been overdue" />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {aging.map((a, i) => <div key={a.label} className={`rounded-2xl p-4 ${['bg-amber-50 dark:bg-amber-500/10', 'bg-orange-50 dark:bg-orange-500/10', 'bg-red-50 dark:bg-red-500/10', 'bg-red-100 dark:bg-red-500/20'][i]}`}><p className="text-xs font-semibold text-slate-500">{a.label}</p><p className="mt-1 text-lg font-extrabold">{money(a.value)}</p></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
