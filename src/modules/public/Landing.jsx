// Capital O2 welcome page: front picture blended into the brand green, sign-in (live) or demo roles, rooms, contact.
import { useState } from 'react';
import { Building2, KeyRound, UserCog, ArrowRight, Phone, Mail, MapPin, Download, ShieldCheck } from 'lucide-react';
import { useStore } from '../../data/store';
import { useLive } from '../../data/live';
import { EfieLogo } from '../../components/layout/Logo';
import { Button } from '../../components/ui';
import PayLogo from '../../components/PayLogo';
import { heroPhoto } from '../../components/PropertyArt';
import { AuthModal } from './LiveAuth';
import { LIVE, DEMO_SITE, APKS, COMPANY } from '../../config';
import { useInstall } from '../../lib/install';

const B = import.meta.env.BASE_URL;
const DEMOS = [
  { id: 'u_owner', icon: Building2, title: 'Owner / MD', text: 'Dashboard, properties, tenants, rent, reports, settings' },
  { id: 'u_mgr', icon: UserCog, title: 'Hostel Manager', text: 'Hostel blocks only: rooms, beds, students, rent' },
  { id: 'u_tenant', icon: KeyRound, title: 'Tenant', text: 'Pay rent by MoMo, receipts, repairs, e-sign tenancy' },
];
const HOMES = [
  ['hostel', 'Capital O2 Hostel', '1-in-1, 2-in-1 and 4-in-1 rooms', 'Pay per semester or academic year'],
  ['mixed', 'Hostel Annex', 'Shared and single rooms', 'Rent per bed in shared rooms'],
  ['apartments', 'Capital O2 Estates', '1 & 2 bedroom apartments', 'Monthly, quarterly or yearly'],
  ['houses', 'Estate townhouses', '3 bedroom townhouses', 'Family living'],
];

export default function Landing() {
  const login = useStore((s) => s.login);
  const demoOwner = useStore((s) => s.owners[0]);
  const brand = useLive((s) => s.brand);
  const [auth, setAuth] = useState(null);
  const install = useInstall();
  const b = LIVE ? brand : demoOwner;
  return (
    <div className="min-h-screen bg-ivory-100 dark:bg-navy-950">
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <img src={heroPhoto(b)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/80 to-brand-900/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24">
          <div className="flex items-center justify-between gap-3">
            <EfieLogo light owner={b} />
            <div className="flex items-center gap-2">
              {install.canInstall && <Button variant="ghost" size="sm" icon={Download} className="!text-white hover:!bg-white/10" onClick={install.prompt}>Install</Button>}
              {LIVE && <Button size="sm" className="!bg-accent-400 !text-brand-950" onClick={() => setAuth('signin')}>Sign in</Button>}
            </div>
          </div>
          <div className="mt-16 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 ring-1 ring-white/15">Estates &amp; Hostel</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Comfortable rooms. Easy rent.</h1>
            <p className="mt-5 text-base text-white/80 sm:text-lg">Welcome to {COMPANY}. Students and tenants pay rent per semester, per year or per month by MoMo or card, get instant receipts, sign their tenancy and report repairs — all from the phone.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {LIVE ? (
                <>
                  <Button size="lg" className="!bg-accent-400 !text-brand-950" icon={ArrowRight} onClick={() => setAuth('signin')}>Sign in</Button>
                  <Button size="lg" variant="ghost" className="!text-white ring-1 ring-white/30 hover:!bg-white/10" onClick={() => setAuth('signup')}>Create account</Button>
                </>
              ) : (
                <Button size="lg" className="!bg-accent-400 !text-brand-950" icon={ArrowRight} onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}>Try the demo</Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2">{['mtn', 'telecel', 'at', 'card'].map((m) => <PayLogo key={m} method={m} className="h-8 w-12" />)}</div>
          </div>
        </div>
      </section>

      {!LIVE && (
        <section id="demo" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">One-click demo</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-900 dark:text-white">Step inside as…</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEMOS.map((d) => (
              <button key={d.id} type="button" onClick={() => login(d.id)} className="card p-5 text-left transition hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white"><d.icon className="h-6 w-6" /></div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{d.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Enter <ArrowRight className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="border-y border-ivory-200 bg-white py-14 dark:border-white/5 dark:bg-navy-900">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-brand-900 dark:text-white">Our hostel &amp; estates</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOMES.map(([img, name, kind, price]) => (
              <div key={name} className="card overflow-hidden">
                <img src={`${B}photos/${img}.jpg`} alt={name} loading="lazy" className="h-48 w-full object-cover" />
                <div className="p-4"><p className="font-display text-lg font-semibold">{name}</p><p className="text-sm text-slate-500">{kind}</p><p className="mt-1 text-sm font-semibold text-brand-600">{price}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:px-8 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold text-brand-900 dark:text-white">Talk to us</h2>
          <div className="mt-4 space-y-3 text-sm">
            {b?.phone && <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-brand-600" /> {b.phone}</p>}
            {b?.email && <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-brand-600" /> {b.email}</p>}
            {b?.address && <p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-brand-600" /> {b.address}</p>}
            {!b?.phone && !b?.email && <p className="text-slate-500">Visit the Capital O2 office or ask the hostel porter for help with your account.</p>}
          </div>
        </div>
        {LIVE ? (
          <div className="rounded-[var(--radius)] bg-brand-900 p-6 text-white">
            <p className="flex items-center gap-2 font-bold"><Download className="h-5 w-5 text-accent-300" /> Get the Android apps</p>
            <p className="mt-1 text-sm text-white/70">On iPhone: open this page in Safari → Share → Add to Home Screen.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.values(APKS).map((a) => (
                <a key={a.name} href={a.url} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 hover:bg-white/15">
                  <p className="font-bold">{a.name}</p><p className="text-xs text-white/60">{a.who}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-300"><Download className="h-3.5 w-3.5" /> Download APK</p>
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/60">Just looking? <a href={DEMO_SITE} className="font-semibold underline">Open the demo</a>.</p>
          </div>
        ) : (
          <div className="rounded-[var(--radius)] bg-brand-900 p-6 text-white">
            <p className="font-bold">This is a demo</p>
            <p className="mt-1 text-sm text-white/70">Sample tenants and payments, kept in this browser only. Payments are simulated.</p>
          </div>
        )}
      </section>

      <footer className="bg-brand-950 py-8 text-center text-xs text-white/60">
        <div className="mb-3 flex justify-center"><EfieLogo light owner={b} /></div>
        <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Secure payments by Paystack & Hubtel · © {new Date().getFullYear()} {COMPANY}</p>
      </footer>
      {LIVE && <AuthModal open={!!auth} start={auth || 'signin'} onClose={() => setAuth(null)} />}
    </div>
  );
}
