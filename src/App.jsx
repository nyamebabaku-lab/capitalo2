import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useStore } from './data/store';
import { useMe } from './lib/session';
import { applyTheme, DEFAULT_THEME } from './lib/theme';
import { Toaster, Button } from './components/ui';
import AppShell from './components/layout/AppShell';
import Landing from './modules/public/Landing';
import { LIVE, APP_ROLE, appForRole } from './config';
import { AppStart, WrongApp } from './modules/public/AppGate';
import { useLive, startLive } from './data/live';
import { FinishSetup } from './modules/public/LiveAuth';
import { EfieMark } from './components/layout/Logo';

const PaidReturn = lazy(() => import('./modules/shared/PaidReturn'));
if (LIVE) startLive();

const Dashboard = lazy(() => import('./modules/owner/Dashboard'));
const Properties = lazy(() => import('./modules/owner/Properties'));
const PropertyDetail = lazy(() => import('./modules/owner/PropertyDetail'));
const Tenants = lazy(() => import('./modules/owner/Tenants'));
const TenantDetail = lazy(() => import('./modules/owner/TenantDetail'));
const Leases = lazy(() => import('./modules/owner/Leases'));
const Rent = lazy(() => import('./modules/owner/Rent'));
const Maintenance = lazy(() => import('./modules/owner/Maintenance'));
const Expenses = lazy(() => import('./modules/owner/Expenses'));
const Messages = lazy(() => import('./modules/owner/Messages'));
const Reports = lazy(() => import('./modules/owner/Reports'));
const Staff = lazy(() => import('./modules/owner/Staff'));
const Settings = lazy(() => import('./modules/owner/Settings'));
const TenantHome = lazy(() => import('./modules/tenant/TenantHome'));
const TenantPay = lazy(() => import('./modules/tenant/TenantPay'));
const TenantHistory = lazy(() => import('./modules/tenant/TenantHistory'));
const TenantRequests = lazy(() => import('./modules/tenant/TenantRequests'));
const TenantLease = lazy(() => import('./modules/tenant/TenantLease'));
const TenantNotices = lazy(() => import('./modules/tenant/TenantNotices'));

const Spinner = () => <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;

function Suspended() {
  const logout = useStore((s) => s.logout);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Account on hold</h1>
        <p className="mt-2 text-sm text-slate-500">This account is on hold. Please contact the Capital O2 office.</p>
        <Button className="mt-6" onClick={logout}>Sign out</Button>
      </div>
    </div>
  );
}

function RoleRoutes({ role }) {
  if (role === 'tenant')
    return (
      <Routes>
        <Route path="/" element={<TenantHome />} />
        <Route path="/pay" element={<TenantPay />} />
        <Route path="/history" element={<TenantHistory />} />
        <Route path="/requests" element={<TenantRequests />} />
        <Route path="/lease" element={<TenantLease />} />
        <Route path="/notices" element={<TenantNotices />} />
        <Route path="/paid" element={<PaidReturn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/tenants/:id" element={<TenantDetail />} />
      <Route path="/leases" element={<Leases />} />
      <Route path="/rent" element={<Rent />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/paid" element={<PaidReturn />} />
      {role === 'owner' && <Route path="/staff" element={<Staff />} />}
      {role === 'owner' && <Route path="/settings" element={<Settings />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, owner } = useMe();
  const phase = useLive((s) => s.phase);
  const runBilling = useStore((s) => s.runBilling);
  const brand = useLive((s) => s.brand);
  const theme = user && owner ? owner.theme : brand?.theme || DEFAULT_THEME;
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => { if (user && !LIVE) runBilling(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let body;
  if (LIVE && phase === 'loading') body = <div className="flex min-h-screen flex-col items-center justify-center gap-4"><EfieMark className="h-14 w-14 animate-pulse-soft" /><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>;
  else if (LIVE && phase === 'noProfile') body = <FinishSetup />;
  else if (!user) body = APP_ROLE ? <AppStart /> : <Landing />;
  else if (APP_ROLE && appForRole(user.role) !== APP_ROLE) body = <WrongApp role={user.role} />;
  else if (owner?.status === 'suspended') body = <Suspended />;
  else
    body = (
      <HashRouter>
        <AppShell>
          <Suspense fallback={<Spinner />}><RoleRoutes role={user.role} /></Suspense>
        </AppShell>
      </HashRouter>
    );
  return (
    <>
      {body}
      <Toaster />
    </>
  );
}
