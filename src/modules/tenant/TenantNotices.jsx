import { Megaphone } from 'lucide-react';
import { Card, PageHeader, EmptyState } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useTenant } from './useTenant';

export default function TenantNotices() {
  const t = useTenant();
  return (
    <div className="space-y-4">
      <PageHeader title="Notices" subtitle={`From ${t.owner.company}`} />
      {t.notices.length ? t.notices.map((n) => (
        <Card key={n.id} className="p-5">
          <p className="font-bold">{n.title}</p>
          <p className="text-xs text-slate-400">{fmtDateTime(n.at)}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
        </Card>
      )) : <Card><EmptyState icon={Megaphone} title="No notices" /></Card>}
    </div>
  );
}
