// Android apps: a start screen with Capital O2's front picture, and a redirect when an account belongs in the other app.
import { useState } from 'react';
import { Download, LogOut, KeyRound, Building2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { EfieMark } from '../../components/layout/Logo';
import { heroPhoto } from '../../components/PropertyArt';
import { AuthModal } from './LiveAuth';
import { APP_ROLE, APKS, APP_NAME, SITE, appForRole, COMPANY } from '../../config';
import { signOut, useLive } from '../../data/live';

const ICON = { tenant: KeyRound, manager: Building2 };
const TAG = { tenant: 'Pay rent, get receipts, report repairs', manager: 'Rooms, beds, tenants, rent and repairs' };

export function AppStart() {
  const brand = useLive((s) => s.brand);
  const [auth, setAuth] = useState(null);
  const Icon = ICON[APP_ROLE];
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand-950 px-6 pb-10 pt-safe text-white">
      <img src={heroPhoto(brand)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/40 via-brand-950/60 to-brand-950" />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="rounded-[2rem] bg-white p-3 shadow-2xl"><EfieMark className="h-24 w-24" /></div>
        <h1 className="mt-6 text-4xl font-semibold">{APP_NAME}</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/80"><Icon className="h-4 w-4 text-accent-300" /> {TAG[APP_ROLE]}</p>
        <p className="mt-1 text-xs italic text-white/60">{brand?.tagline || 'Estates & Hostel'}</p>
      </div>
      <div className="relative space-y-3">
        <Button size="lg" className="w-full !bg-accent-400 !text-brand-950" onClick={() => setAuth('signin')}>Sign in</Button>
        <Button size="lg" variant="ghost" className="w-full !text-white ring-1 ring-white/30" onClick={() => setAuth('signup')}>Create account</Button>
        <p className="text-center text-[11px] text-white/60">{APP_ROLE === 'tenant' ? `Sign up with the phone number ${COMPANY} has for your tenancy.` : 'Staff: sign up with the phone number on your SMS invite.'}</p>
      </div>
      <AuthModal open={!!auth} start={auth || 'signin'} onClose={() => setAuth(null)} />
    </div>
  );
}

export function WrongApp({ role }) {
  const app = APKS[appForRole(role)];
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory-100 p-6 dark:bg-navy-950">
      <div className="card max-w-sm p-8 text-center">
        <EfieMark className="mx-auto h-16 w-16" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Use the {app.name} app</h1>
        <p className="mt-2 text-sm text-slate-500">Your account is for <b>{app.who.toLowerCase()}</b>. This is the {APP_NAME} app — please install {app.name} or use the website.</p>
        <a href={app.url}><Button className="mt-6 w-full" icon={Download}>Download {app.name}</Button></a>
        <a href={SITE} className="mt-3 block text-sm font-semibold text-brand-600">Open the website instead</a>
        <Button variant="ghost" className="mt-4 w-full" icon={LogOut} onClick={signOut}>Sign out</Button>
      </div>
    </div>
  );
}
