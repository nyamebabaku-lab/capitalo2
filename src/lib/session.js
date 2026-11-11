import { useMemo } from 'react';
import { useStore } from '../data/store';

/** The signed-in user plus their owner company (for owners, staff and tenants). */
export function useMe() {
  const userId = useStore((s) => s.session?.userId);
  const users = useStore((s) => s.users);
  const owners = useStore((s) => s.owners);
  const tenants = useStore((s) => s.tenants);
  return useMemo(() => {
    const user = users.find((u) => u.id === userId) || null;
    const owner = user?.ownerId ? owners.find((o) => o.id === user.ownerId) : null;
    const tenant = user?.tenantId ? tenants.find((t) => t.id === user.tenantId) : null;
    return { user, owner, tenant, role: user?.role, isOwner: user?.role === 'owner', isManager: user?.role === 'manager' };
  }, [userId, users, owners, tenants]);
}

/** Records the signed-in owner/staff may see: their company's, limited to assigned properties for staff. */
export function useScoped(col) {
  const { user } = useMe();
  const rows = useStore((s) => s[col]);
  return useMemo(() => {
    if (!user) return [];
    let r = rows.filter((x) => x.ownerId === user.ownerId);
    if (user.role === 'manager' && user.propertyIds) {
      if (col === 'properties') r = r.filter((x) => user.propertyIds.includes(x.id));
      else if (r.length && 'propertyId' in (r[0] || {})) r = r.filter((x) => !x.propertyId || user.propertyIds.includes(x.propertyId));
    }
    return r;
  }, [rows, user, col]);
}

/** Scoped data bundle with lookups, used by most owner pages. */
export function useData() {
  const properties = useScoped('properties');
  const unitsAll = useScoped('units');
  const tenantsAll = useScoped('tenants');
  const leasesAll = useScoped('leases');
  const invoices = useScoped('invoices');
  const payments = useScoped('payments');
  return useMemo(() => {
    const propIds = new Set(properties.map((p) => p.id));
    const units = unitsAll.filter((u) => propIds.has(u.propertyId));
    const unitIds = new Set(units.map((u) => u.id));
    const leases = leasesAll.filter((l) => unitIds.has(l.unitId));
    const tenantIds = new Set(leases.map((l) => l.tenantId));
    const tenants = tenantsAll.filter((t) => tenantIds.has(t.id) || !leasesAll.some((l) => l.tenantId === t.id));
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    return {
      properties, units, tenants, leases, invoices: invoices.filter((i) => !i.unitId || unitIds.has(i.unitId)), payments: payments.filter((p) => !p.unitId || unitIds.has(p.unitId)),
      P: byId(properties), U: byId(units), T: byId(tenantsAll), L: byId(leasesAll),
      activeLease: (unitId) => currentLease(leasesAll.filter((l) => l.unitId === unitId)),
    };
  }, [properties, unitsAll, tenantsAll, leasesAll, invoices, payments]);
}

export const can = (user, perm) => user?.role === 'owner' || user?.role === 'admin' || !!user?.perms?.[perm];

/** The running tenancy (a renewal that has not started yet is skipped while the old one runs). */
export function currentLease(leases) {
  const act = leases.filter((l) => l.status === 'active').sort((a, b) => a.start.localeCompare(b.start));
  const now = new Date().toISOString().slice(0, 10);
  return act.filter((l) => l.start <= now).pop() || act[0];
}
