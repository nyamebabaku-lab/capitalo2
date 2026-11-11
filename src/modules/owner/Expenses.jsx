import { useMemo, useState } from 'react';
import { Plus, Trash2, Download, PiggyBank } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useStore } from '../../data/store';
import { useMe, useData, useScoped } from '../../lib/session';
import { PageHeader, Button, DataTable, FormModal, Card, CardHeader, toast, confirmDialog, StatCard } from '../../components/ui';
import { money, fmtDate, sum, downloadCSV, today, groupBy } from '../../lib/format';
import { thisMonth } from '../../lib/stats';

export const EXPENSE_CATS = ['Repairs & maintenance', 'Security services', 'Cleaning & waste', 'ECG / utilities', 'Property rates (Assembly)', 'Insurance', 'Agent commission', 'Staff wages', 'Legal & admin', 'Other'];
const COLORS = ['rgb(var(--brand-600))', 'rgb(var(--accent-500))', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#84cc16', '#a8a29e'];

export default function Expenses() {
  const { user, owner } = useMe();
  const s = useStore();
  const d = useData();
  const all = useScoped('expenses');
  const [add, setAdd] = useState(false);
  const rows = useMemo(() => [...all].sort((a, b) => b.date.localeCompare(a.date)), [all]);
  const byCat = Object.entries(groupBy(rows, (e) => e.category)).map(([name, list]) => ({ name, value: sum(list, (e) => e.amount) })).sort((a, b) => b.value - a.value);
  return (
    <div>
      <PageHeader title="Expenses" subtitle="What each property costs to run" actions={<><Button variant="secondary" icon={Download} onClick={() => downloadCSV('expenses', rows.map((e) => ({ Date: e.date, Property: d.P[e.propertyId]?.name, Category: e.category, Amount: e.amount, Note: e.note })))}>Export</Button><Button icon={Plus} onClick={() => setAdd(true)}>Add expense</Button></>} />
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-1 lg:grid-cols-1">
          <StatCard label="This month" value={money(sum(rows.filter((e) => e.date.startsWith(thisMonth())), (e) => e.amount))} icon={PiggyBank} tone="rose" />
          <StatCard label="Last 6 months" value={money(sum(rows, (e) => e.amount))} icon={PiggyBank} tone="amber" />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="By category" />
          <div className="flex flex-col items-center gap-4 p-4 sm:flex-row">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer><PieChart><Pie data={byCat} dataKey="value" innerRadius={45} outerRadius={80} paddingAngle={2}>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => money(v)} /></PieChart></ResponsiveContainer>
            </div>
            <div className="grid w-full gap-1.5 sm:grid-cols-2">{byCat.map((c, i) => <div key={c.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="flex-1 truncate">{c.name}</span><b>{money(c.value)}</b></div>)}</div>
          </div>
        </Card>
      </div>
      <DataTable rows={rows} searchText={(e) => `${e.category} ${d.P[e.propertyId]?.name} ${e.note}`} columns={[
        { key: 'date', label: 'Date', render: (e) => fmtDate(e.date) },
        { key: 'property', label: 'Property', render: (e) => d.P[e.propertyId]?.name || 'General' },
        { key: 'category', label: 'Category' },
        { key: 'note', label: 'Note', hideOnMobile: true },
        { key: 'amount', label: 'Amount', render: (e) => <b>{money(e.amount)}</b> },
        { key: 'x', label: '', nosort: true, render: (e) => user.role === 'owner' && <Button size="sm" variant="ghost" icon={Trash2} onClick={async () => (await confirmDialog('Delete expense?', `${e.category} · ${money(e.amount)}`)) && s.remove('expenses', e.id)} /> },
      ]} />
      <FormModal open={add} onClose={() => setAdd(false)} title="Add expense" initial={{ date: today(), category: EXPENSE_CATS[0], propertyId: d.properties[0]?.id }}
        fields={[
          { name: 'propertyId', label: 'Property', type: 'select', options: d.properties.map((p) => ({ value: p.id, label: p.name })) },
          { name: 'category', label: 'Category', type: 'select', options: EXPENSE_CATS, required: true },
          { name: 'amount', label: 'Amount (GH₵)', type: 'number', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'note', label: 'Note', span: 2 },
        ]}
        onSubmit={(v) => { s.add('expenses', { ...v, amount: Number(v.amount), ownerId: owner.id, by: user.name }); setAdd(false); toast.success('Expense saved'); }} />
    </div>
  );
}
