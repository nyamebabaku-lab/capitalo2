import { useMemo } from 'react';
import { useStore } from '../../data/store';
import { useMe, currentLease } from '../../lib/session';
import { balance } from '../../lib/billing';
import { sum, today, round2 } from '../../lib/format';

export function useTenant() {
  const { user, owner, tenant } = useMe();
  const s = useStore();
  return useMemo(() => {
    const leases = s.leases.filter((l) => l.tenantId === tenant.id);
    const lease = currentLease(leases) || leases[0];
    const unit = s.units.find((u) => u.id === lease?.unitId);
    const property = s.properties.find((p) => p.id === unit?.propertyId);
    const invoices = s.invoices.filter((i) => i.tenantId === tenant.id && !i.void).sort((a, b) => a.due.localeCompare(b.due));
    const open = invoices.filter((i) => balance(i) > 0);
    const dueNow = round2(sum(open.filter((i) => i.due <= today()), balance));
    const upcoming = open.filter((i) => i.due > today());
    const payments = s.payments.filter((p) => p.tenantId === tenant.id).sort((a, b) => b.at.localeCompare(a.at));
    const notices = s.notices.filter((n) => n.ownerId === owner.id && (!n.propertyId || n.propertyId === property?.id)).sort((a, b) => b.at.localeCompare(a.at));
    const requests = s.maintenance.filter((m) => m.tenantId === tenant.id).sort((a, b) => b.at.localeCompare(a.at));
    return { user, owner, tenant, lease, leases, unit, property, invoices, open, dueNow, upcoming, payments, notices, requests, totalOpen: round2(sum(open, balance)) };
  }, [s, user, owner, tenant]);
}
