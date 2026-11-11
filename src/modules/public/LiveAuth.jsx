// Capital O2 live sign-in / sign-up. Tenants and staff are matched by the phone number Capital O2 saved for them
// (the company code is built in); the owner account is claimed once with the reserved email.
import { useEffect, useState } from 'react';
import { KeyRound, UserCog, ArrowLeft, Loader2, Crown, LogOut, Eye, EyeOff } from 'lucide-react';
import { Modal, Button, Field, Input, Segmented, toast } from '../../components/ui';
import { EfieLogo } from '../../components/layout/Logo';
import { signIn, joinCompany, claimOwner, signOut, resetPassword, useLive } from '../../data/live';
import { friendly } from '../../lib/supabase';
import { APP_ROLE, COMPANY } from '../../config';

const ALL_ROLES = [
  { id: 'tenant', icon: KeyRound, title: 'I stay / rent with Capital O2', text: 'Students and tenants: pay rent, receipts, repairs' },
  { id: 'staff', icon: UserCog, title: 'I work for Capital O2', text: 'Manager, caretaker or accounts — invited by SMS' },
  { id: 'owner', icon: Crown, title: 'First-time set-up', text: 'Owner account — reserved email only, once' },
];
const rolesFor = (ownerExists) => ALL_ROLES.filter((r) => (APP_ROLE === 'tenant' ? r.id === 'tenant' : APP_ROLE === 'manager' ? r.id !== 'tenant' : true)).filter((r) => r.id !== 'owner' || !ownerExists);

function Password({ value, onChange, label = 'Password', hint }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" autoComplete="current-password" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Show password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </Field>
  );
}

function RoleForm({ role, v, set, withAccount }) {
  if (role === 'owner')
    return (
      <div className="grid gap-4">
        <Field label="Your name"><Input value={v.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder="Managing Director" /></Field>
        {withAccount && <Field label="Email *" hint="Only the reserved set-up email is accepted"><Input type="email" value={v.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>}
        {withAccount && <Password value={v.password || ''} onChange={(x) => set({ password: x })} hint="At least 8 characters" />}
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name *"><Input value={v.name || ''} onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field label="Phone (MoMo) *" hint={role === 'tenant' ? 'The number Capital O2 has for your room or tenancy' : 'The number on your SMS invite'}><Input inputMode="tel" value={v.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="024 123 4567" /></Field>
      {withAccount && <Field label="Email (optional)" hint="Lets you reset a forgotten password"><Input type="email" value={v.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>}
      {withAccount && <Password value={v.password || ''} onChange={(x) => set({ password: x })} hint="At least 8 characters" />}
    </div>
  );
}

const check = (role, v, withAccount) => {
  if (role === 'owner') return withAccount && !v.email?.includes('@') ? 'Enter the reserved email' : withAccount && (v.password || '').length < 8 ? 'Use a password of at least 8 characters' : '';
  if (!v.name?.trim()) return 'Enter your name';
  if (!/^0\d{9}$/.test((v.phone || '').replace(/\s|\+233/g, '').replace(/^233/, '0'))) return 'Enter a 10-digit phone number, e.g. 0241234567';
  if (withAccount && (v.password || '').length < 8) return 'Use a password of at least 8 characters';
  return '';
};
const normPhone = (p) => `0${String(p).replace(/\D/g, '').slice(-9)}`;

export function AuthModal({ open, onClose, start = 'signin' }) {
  const ownerExists = useLive((s) => s.brand?.ownerExists ?? true);
  const ROLES = rolesFor(ownerExists);
  const [tab, setTab] = useState(start);
  const [role, setRole] = useState(null);
  const [v, setV] = useState({});
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  useEffect(() => { if (open) { setTab(start); setRole(ROLES.length === 1 ? ROLES[0].id : null); setV({}); setForgot(false); } }, [open, start]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => setV((x) => ({ ...x, ...p }));

  const doSignIn = async () => {
    if (!v.id || !v.password) return toast.error('Enter your phone/email and password');
    setBusy(true);
    try { await signIn(v.id, v.password); onClose(); } catch (e) { toast.error('Could not sign in', e.message); }
    setBusy(false);
    return null;
  };
  const doSignUp = async () => {
    const err = check(role, v, true);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      if (role === 'owner') { await claimOwner({ ...v, name: v.name || 'Managing Director' }); toast.success('Owner account ready', `Welcome to ${COMPANY}`); }
      else { const r = await joinCompany({ ...v, phone: normPhone(v.phone) }); toast.success(r === 'manager' ? 'Welcome to the team' : 'Welcome home', 'Your account is ready'); }
      onClose();
    } catch (e) { toast.error('Could not create your account', friendly(e)); }
    setBusy(false);
    return null;
  };
  const doReset = async () => {
    if (!v.id?.includes('@')) return toast.error('Enter the email on your account', 'Phone-only accounts: ask the Capital O2 office to help you.');
    try { await resetPassword(v.id); toast.success('Check your email', 'We sent a link to set a new password'); setForgot(false); } catch (e) { toast.error('Not sent', e.message); }
    return null;
  };

  return (
    <Modal open={open} onClose={onClose} title={tab === 'signin' ? (forgot ? 'Reset password' : 'Welcome back') : 'Create your account'} size="md"
      footer={tab === 'signin' ? (
        forgot ? <Button className="w-full" onClick={doReset}>Send reset link</Button> : <Button className="w-full" disabled={busy} onClick={doSignIn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in</Button>
      ) : role && <>{ROLES.length > 1 && <Button variant="secondary" icon={ArrowLeft} onClick={() => setRole(null)}>Back</Button>}<Button disabled={busy} onClick={doSignUp}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create account</Button></>}>
      <Segmented className="mb-5 w-full [&>button]:flex-1" value={tab} onChange={(t) => { setTab(t); setRole(ROLES.length === 1 ? ROLES[0].id : null); }} options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]} />
      {tab === 'signin' ? (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); forgot ? doReset() : doSignIn(); }}>
          <Field label="Phone number or email"><Input autoFocus value={v.id || ''} onChange={(e) => set({ id: e.target.value })} placeholder="0241234567 or you@email.com" autoComplete="username" /></Field>
          {!forgot && <Password value={v.password || ''} onChange={(x) => set({ password: x })} />}
          <button type="button" onClick={() => setForgot(!forgot)} className="text-xs font-semibold text-brand-600">{forgot ? 'Back to sign in' : 'Forgot password?'}</button>
          <button type="submit" className="hidden" />
        </form>
      ) : !role ? (
        <div className="space-y-3">
          {ROLES.map((r) => (
            <button key={r.id} type="button" onClick={() => setRole(r.id)} className="flex w-full items-center gap-4 rounded-2xl border border-ivory-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-white/10">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white"><r.icon className="h-5 w-5" /></span>
              <span><span className="block font-bold">{r.title}</span><span className="text-xs text-slate-500">{r.text}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <RoleForm role={role} v={v} set={set} withAccount />
      )}
    </Modal>
  );
}

/** Signed in, but the account isn't linked to Capital O2 yet (e.g. sign-up was interrupted). */
export function FinishSetup() {
  const { email, ownerExists } = useLive();
  const ROLES = rolesFor(ownerExists);
  const [role, setRole] = useState(null);
  const [v, setV] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (p) => setV((x) => ({ ...x, ...p }));
  const go = async () => {
    const err = check(role, v, false);
    if (err) return toast.error(err);
    setBusy(true);
    try { if (role === 'owner') await claimOwner({ name: v.name || 'Managing Director' }); else await joinCompany({ ...v, phone: normPhone(v.phone) }); } catch (e) { toast.error('Not done', friendly(e)); }
    setBusy(false);
    return null;
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory-100 p-4 dark:bg-navy-950">
      <div className="card w-full max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between"><EfieLogo /><Button variant="ghost" size="sm" icon={LogOut} onClick={signOut}>Sign out</Button></div>
        <h1 className="font-display text-2xl font-semibold">Finish setting up</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {email?.replace(/@phone\.capitalo2\.app$/, '')}. Tell us who you are.</p>
        {!role ? (
          <div className="mt-6 space-y-3">
            {ROLES.map((r) => (
              <button key={r.id} type="button" onClick={() => setRole(r.id)} className="flex w-full items-center gap-4 rounded-2xl border border-ivory-200 p-4 text-left hover:border-brand-400 dark:border-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white"><r.icon className="h-5 w-5" /></span>
                <span><span className="block font-bold">{r.title}</span><span className="text-xs text-slate-500">{r.text}</span></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <RoleForm role={role} v={v} set={set} />
            <div className="flex justify-between"><Button variant="secondary" icon={ArrowLeft} onClick={() => setRole(null)}>Back</Button><Button disabled={busy} onClick={go}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Continue</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
