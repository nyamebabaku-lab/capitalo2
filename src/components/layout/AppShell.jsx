import { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, MoreHorizontal, Moon, Search, Sun, X, Sparkles, ChevronRight, Building2, User, Receipt } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe } from '../../lib/session';
import { navFor } from '../../lib/nav';
import { cx, Avatar, Modal } from '../ui';
import { CompanyLogo } from './Logo';
import { LIVE } from '../../config';
import { fmtDateTime, money } from '../../lib/format';

function SideNav({ nav, onNavigate, styleKind }) {
  const light = styleKind === 'light';
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              light
                ? isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-white/5'
                : isActive ? 'bg-accent-400 text-brand-950 shadow-lg shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <n.icon className="h-[18px] w-[18px] shrink-0" />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar({ nav, owner, user, onNavigate, mobile }) {
  const styleKind = user.role === 'admin' ? 'dark' : owner?.theme?.sidebar || 'dark';
  const light = styleKind === 'light';
  const bg = light ? 'bg-white border-r border-ivory-200 dark:bg-navy-900 dark:border-white/5' : styleKind === 'brand' ? 'bg-gradient-to-b from-brand-600 to-brand-900' : 'bg-brand-950';
  return (
    <aside className={cx('flex h-full w-72 flex-col', bg, mobile && 'animate-slide-in')}>
      <div className={cx('relative px-5 pb-4 pt-5', !light && 'kente-soft')}>
        {(
          <div className="flex items-center gap-3">
            <CompanyLogo owner={owner} size="md" />
            <div className="min-w-0">
              <p className={cx('truncate font-display text-base font-semibold leading-tight', light ? 'text-slate-900 dark:text-white' : 'text-white')}>{owner?.company || 'Your company'}</p>
              <p className={cx('truncate text-xs', light ? 'text-slate-500' : 'text-white/60')}>{owner?.tagline || 'Property management'}</p>
            </div>
          </div>
        )}
        <div className="kente absolute inset-x-0 bottom-0 h-1 opacity-80" />
      </div>
      <SideNav nav={nav} onNavigate={onNavigate} styleKind={styleKind} />
      <div className={cx('m-3 flex items-center gap-3 rounded-2xl p-3', light ? 'bg-ivory-100 dark:bg-white/5' : 'bg-white/10')}>
        <Avatar name={user.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={cx('truncate text-sm font-semibold', light ? 'text-slate-800 dark:text-white' : 'text-white')}>{user.name}</p>
          <p className={cx('truncate text-xs capitalize', light ? 'text-slate-500' : 'text-white/60')}>{user.title || user.role}</p>
        </div>
      </div>
    </aside>
  );
}

function GlobalSearch({ open, onClose }) {
  const { user } = useMe();
  const s = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2 || !user) return [];
    const mine = (x) => x.ownerId === user.ownerId;
    const out = [];
    s.tenants.filter(mine).filter((t) => `${t.name} ${t.phone} ${t.email}`.toLowerCase().includes(n)).slice(0, 6).forEach((t) => out.push({ icon: User, title: t.name, sub: `Tenant · ${t.phone}`, to: `/tenants/${t.id}` }));
    s.properties.filter(mine).filter((p) => `${p.name} ${p.area} ${p.city}`.toLowerCase().includes(n)).slice(0, 4).forEach((p) => out.push({ icon: Building2, title: p.name, sub: `${p.area}, ${p.city}`, to: `/properties/${p.id}` }));
    s.units.filter(mine).filter((u) => `${u.label} ${u.kind}`.toLowerCase().includes(n)).slice(0, 4).forEach((u) => out.push({ icon: Building2, title: `${u.label} · ${s.properties.find((p) => p.id === u.propertyId)?.name}`, sub: u.kind, to: `/properties/${u.propertyId}` }));
    s.payments.filter(mine).filter((p) => p.ref.toLowerCase().includes(n)).slice(0, 4).forEach((p) => out.push({ icon: Receipt, title: `Receipt ${p.ref}`, sub: money(p.amount), to: `/rent?receipt=${p.id}` }));
    return out;
  }, [q, s, user]);
  return (
    <Modal open={open} onClose={onClose} title="Search" subtitle="Tenants, properties, units and receipts">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input autoFocus className="input pl-9" placeholder="Type a name, phone, unit or receipt no…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 divide-y divide-ivory-200 dark:divide-white/5">
        {results.map((r, i) => (
          <button key={i} type="button" onClick={() => { nav(r.to); onClose(); }} className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-brand-50/50 dark:hover:bg-white/5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15"><r.icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="block truncate text-xs text-slate-500">{r.sub}</span></span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        ))}
        {q.length >= 2 && !results.length && <p className="py-8 text-center text-sm text-slate-500">No matches for “{q}”.</p>}
      </div>
    </Modal>
  );
}

function Alerts({ open, onClose }) {
  const { user } = useMe();
  const all = useStore((s) => s.alerts);
  const alerts = useMemo(() => all.filter((a) => a.ownerId === user?.ownerId || (user?.role === 'admin' && a.ownerId === 'admin')), [all, user]);
  const readAlerts = useStore((s) => s.readAlerts);
  useEffect(() => { if (open && user) readAlerts(user.role === 'admin' ? 'admin' : user.ownerId); }, [open, user, readAlerts]);
  return (
    <Modal open={open} onClose={onClose} title="Notifications" size="sm">
      {alerts.length ? (
        <div className="divide-y divide-ivory-200 dark:divide-white/5">
          {alerts.map((a) => (
            <div key={a.id} className="py-3">
              <p className="text-sm font-semibold">{a.title}</p>
              {a.text && <p className="text-xs text-slate-500">{a.text}</p>}
              <p className="mt-1 text-[11px] text-slate-400">{fmtDateTime(a.at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">You’re all caught up. New payments and requests will show here.</p>
      )}
    </Modal>
  );
}

export default function AppShell({ children }) {
  const { user, owner } = useMe();
  const logout = useStore((s) => s.logout);
  const update = useStore((s) => s.update);
  const testMode = useStore((s) => s.platform.testMode);
  const unread = useStore((s) => s.alerts.filter((a) => !a.read && (a.ownerId === user?.ownerId || (user?.role === 'admin' && a.ownerId === 'admin'))).length);
  const [drawer, setDrawer] = useState(false);
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(false);
  const [bell, setBell] = useState(false);
  const loc = useLocation();
  const nav = navFor(user);
  const tabs = nav.filter((n) => n.tab).slice(0, 4);
  const current = [...nav].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)));
  useEffect(() => { setDrawer(false); setMore(false); window.scrollTo(0, 0); }, [loc.pathname]);
  const dark = owner?.theme?.dark;
  const toggleDark = () => {
    if (owner && user.role === 'owner') update('owners', owner.id, (o) => ({ theme: { ...o.theme, dark: !o.theme.dark } }));
    else document.documentElement.classList.toggle('dark');
  };
  const isTenant = user.role === 'tenant';

  return (
    <div className="flex min-h-screen">
      {!isTenant && (
        <div className="no-print sticky top-0 hidden h-screen lg:block">
          <Sidebar nav={nav} owner={owner} user={user} />
        </div>
      )}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-72"><Sidebar nav={nav} owner={owner} user={user} mobile onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {testMode && (
          <div className="no-print flex items-center justify-center gap-2 bg-accent-400 px-3 py-1 text-center text-[11px] font-semibold text-brand-950">
            <Sparkles className="h-3 w-3" /> {LIVE ? 'Test mode' : 'Demo mode'}<span className="hidden sm:inline"> — payments{LIVE ? '' : ' and SMS'} are simulated. No real money moves.</span><span className="sm:hidden"> · no real money moves</span>
          </div>
        )}
        <header className="no-print glass sticky top-0 z-30 border-b border-ivory-200/80 pt-safe dark:border-white/5">
          <div className={cx('mx-auto flex h-16 items-center gap-3 px-4 sm:px-6', isTenant ? 'max-w-3xl' : 'max-w-7xl')}>
            {!isTenant && (
              <button type="button" onClick={() => setDrawer(true)} className="-ml-1 rounded-xl p-2 text-slate-600 hover:bg-ivory-200 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            )}
            {isTenant ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <CompanyLogo owner={owner} size="sm" />
                <p className="truncate font-display text-base font-semibold text-slate-900 dark:text-white">{owner?.company}</p>
              </div>
            ) : (
              <p className="min-w-0 truncate font-display text-lg font-semibold text-slate-900 dark:text-white lg:hidden">{current?.label}</p>
            )}
            <div className="ml-auto flex items-center gap-1">
              {['owner', 'manager'].includes(user.role) && (
                <button type="button" onClick={() => setSearch(true)} className="hidden h-10 items-center gap-2 rounded-xl bg-ivory-200/70 px-3 text-sm text-slate-500 hover:bg-ivory-200 dark:bg-white/5 sm:flex">
                  <Search className="h-4 w-4" /> Search… <kbd className="ml-6 rounded bg-white px-1.5 text-[10px] font-semibold dark:bg-white/10">⌘K</kbd>
                </button>
              )}
              {['owner', 'manager'].includes(user.role) && (
                <button type="button" onClick={() => setSearch(true)} className="rounded-xl p-2 text-slate-600 hover:bg-ivory-200 dark:text-slate-300 dark:hover:bg-white/10 sm:hidden" aria-label="Search"><Search className="h-5 w-5" /></button>
              )}
              <button type="button" onClick={toggleDark} className="rounded-xl p-2 text-slate-600 hover:bg-ivory-200 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Light or dark">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              {!isTenant && (
                <button type="button" onClick={() => setBell(true)} className="relative rounded-xl p-2 text-slate-600 hover:bg-ivory-200 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread}</span>}
                </button>
              )}
              <button type="button" onClick={logout} className="rounded-xl p-2 text-slate-600 hover:bg-ivory-200 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Sign out" title="Sign out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className={cx('mx-auto w-full flex-1 animate-fade-in px-4 pb-28 pt-6 sm:px-6 lg:pb-10', isTenant ? 'max-w-3xl' : 'max-w-7xl')} key={loc.pathname}>
          {children}
        </main>
      </div>

      {/* Phone tab bar */}
      <nav className={cx('no-print glass fixed inset-x-0 bottom-0 z-40 border-t border-ivory-200 pb-safe dark:border-white/5', !isTenant && 'lg:hidden')}>
        <div className={cx('mx-auto grid', isTenant ? 'max-w-3xl' : '', `grid-cols-5`)}>
          {tabs.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400')}>
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'bg-brand-100 dark:bg-brand-500/20')}><n.icon className="h-5 w-5" /></span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-slate-400">
            <span className="flex h-8 w-12 items-center justify-center rounded-full"><MoreHorizontal className="h-5 w-5" /></span>More
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl bg-white p-5 safe-bottom dark:bg-navy-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} size="sm" />
                <div><p className="text-sm font-bold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.title || user.role}</p></div>
              </div>
              <button type="button" onClick={() => setMore(false)} className="rounded-xl p-2 hover:bg-ivory-200 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {nav.filter((n) => !tabs.includes(n)).concat(tabs).map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-semibold', isActive ? 'bg-brand-600 text-white' : 'bg-ivory-100 text-slate-700 dark:bg-white/5 dark:text-slate-200')}>
                  <n.icon className="h-5 w-5" />{n.label}
                </NavLink>
              ))}
              <button type="button" onClick={logout} className="flex flex-col items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-500/10"><LogOut className="h-5 w-5" />Sign out</button>
            </div>
          </div>
        </div>
      )}

      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <Alerts open={bell} onClose={() => setBell(false)} />
      <KeyShortcut onOpen={() => ['owner', 'manager'].includes(user.role) && setSearch(true)} />

    </div>
  );
}

function KeyShortcut({ onOpen }) {
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpen(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onOpen]);
  return null;
}
