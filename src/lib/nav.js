import { LayoutDashboard, Building2, Users, FileSignature, Receipt, Wrench, PiggyBank, MessageSquare, BarChart3, UserCog, Settings, Home, CreditCard, History, Megaphone } from 'lucide-react';

export const OWNER_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, tab: true },
  { to: '/properties', label: 'Properties', icon: Building2, tab: true },
  { to: '/tenants', label: 'Tenants', icon: Users, tab: true, perm: 'tenants' },
  { to: '/leases', label: 'Tenancies', icon: FileSignature, perm: 'tenants' },
  { to: '/rent', label: 'Rent & Bills', icon: Receipt, tab: true, perm: 'payments' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, perm: 'maintenance' },
  { to: '/expenses', label: 'Expenses', icon: PiggyBank, perm: 'expenses' },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports' },
  { to: '/staff', label: 'Staff', icon: UserCog, ownerOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, ownerOnly: true },
];

export const TENANT_NAV = [
  { to: '/', label: 'Home', icon: Home, tab: true },
  { to: '/pay', label: 'Pay rent', icon: CreditCard, tab: true },
  { to: '/history', label: 'Payments', icon: History, tab: true },
  { to: '/requests', label: 'Repairs', icon: Wrench, tab: true },
  { to: '/lease', label: 'My tenancy', icon: FileSignature },
  { to: '/notices', label: 'Notices', icon: Megaphone },
];


export function navFor(user) {
  if (!user) return [];
  if (user.role === 'tenant') return TENANT_NAV;
  if (user.role === 'manager') return OWNER_NAV.filter((n) => !n.ownerOnly && (!n.perm || user.perms?.[n.perm]));
  return OWNER_NAV;
}
