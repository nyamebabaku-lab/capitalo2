import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Download, Users } from 'lucide-react';
import { useData } from '../../lib/session';
import { PageHeader, Button, DataTable, Avatar, Segmented, StatCard, Badge } from '../../components/ui';
import { balance, leaseEnd, daysLeft } from '../../lib/billing';
import { money, sum, fmtDate, downloadCSV } from '../../lib/format';
import { NewLease } from '../shared/Lease';

export default function Tenants() {
  const d = useData();
  const nav = useNavigate();
  const [filter, setFilter] = useState('current');
  const [lease, setLease] = useState(false);
  const rows = useMemo(() => d.tenants.map((t) => {
    const l = d.leases.filter((x) => x.tenantId === t.id).sort((a, b) => b.start.localeCompare(a.start));
    const active = l.find((x) => x.status === 'active');
    const owed = sum(d.invoices.filter((i) => i.tenantId === t.id && !i.void && i.due <= new Date().toISOString().slice(0, 10)), balance);
    return { ...t, lease: active || l[0], active: !!active, unit: d.U[(active || l[0])?.unitId], owed };
  }), [d]);
  const view = rows.filter((r) => (filter === 'current' ? r.active : filter === 'owing' ? r.owed > 0 : filter === 'former' ? !r.active : true));
  const exportCsv = () => downloadCSV('tenants', view.map((r) => ({ Name: r.name, Phone: r.phone, Email: r.email, 'Ghana Card': r.ghanaCard, Unit: r.unit?.label, Property: d.P[r.unit?.propertyId]?.name, Rent: r.lease?.rent, 'Lease ends': r.lease ? leaseEnd(r.lease) : '', Owes: r.owed })));
  return (
    <div>
      <PageHeader title="Tenants" subtitle="Everyone renting from you, with balances and tenancy dates"
        actions={<><Button variant="secondary" icon={Download} onClick={exportCsv}>Export</Button><Button icon={UserPlus} onClick={() => setLease(true)}>New tenancy</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current tenants" value={rows.filter((r) => r.active).length} icon={Users} tone="brand" />
        <StatCard label="Owing rent" value={rows.filter((r) => r.owed > 0).length} sub={money(sum(rows, (r) => r.owed))} icon={Users} tone="rose" />
        <StatCard label="Ending in 60 days" value={rows.filter((r) => r.active && daysLeft(r.lease) <= 60).length} icon={Users} tone="amber" />
        <StatCard label="Former tenants" value={rows.filter((r) => !r.active).length} icon={Users} tone="teal" />
      </div>
      <DataTable
        rows={view}
        onRowClick={(r) => nav(`/tenants/${r.id}`)}
        searchText={(r) => `${r.name} ${r.phone} ${r.email} ${r.unit?.label} ${d.P[r.unit?.propertyId]?.name}`}
        toolbar={<Segmented value={filter} onChange={setFilter} options={[{ value: 'current', label: 'Current' }, { value: 'owing', label: 'Owing' }, { value: 'former', label: 'Former' }, { value: 'all', label: 'All' }]} />}
        columns={[
          { key: 'name', label: 'Tenant', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} size="sm" /><div><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-500">{r.phone}</p></div></div> },
          { key: 'unit', label: 'Unit', sort: (r) => r.unit?.label, render: (r) => r.unit ? <div><p className="font-medium">{r.unit.label}</p><p className="text-xs text-slate-500">{d.P[r.unit.propertyId]?.name}</p></div> : '—' },
          { key: 'rent', label: 'Rent / mo', hideOnMobile: true, sort: (r) => r.lease?.rent, render: (r) => money(r.lease?.rent) },
          { key: 'ends', label: 'Tenancy ends', hideOnMobile: true, sort: (r) => (r.lease ? leaseEnd(r.lease) : ''), render: (r) => r.lease ? <span className={r.active && daysLeft(r.lease) <= 60 ? 'font-semibold text-amber-600' : ''}>{fmtDate(r.lease.endedOn || leaseEnd(r.lease))}</span> : '—' },
          { key: 'owed', label: 'Balance', render: (r) => (r.owed > 0 ? <span className="font-bold text-red-600">{money(r.owed)}</span> : <Badge tone="green">Clear</Badge>) },
        ]}
      />
      <NewLease open={lease} onClose={() => setLease(false)} />
    </div>
  );
}
