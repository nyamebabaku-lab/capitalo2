import { useState } from 'react';
import { Palette, Building2, Scale, MessageSquare, Crown, RotateCcw, CheckCircle2, ShieldCheck, Clock, Copy, Smartphone } from 'lucide-react';
import PaymentsTab from './PaymentsTab';
import { LIVE } from '../../config';
import { useStore } from '../../data/store';
import { useMe } from '../../lib/session';
import { PageHeader, Tabs, Card, CardHeader, Field, Input, Textarea, Button, Badge, toast, confirmDialog } from '../../components/ui';
import { LogoPicker, ColourPicker, StylePicker, BrandPreview, readImage } from '../shared/BrandEditor';
import { WideLogo } from '../../components/layout/Logo';
import { heroPhoto } from '../../components/PropertyArt';
import { TermsEditor, DEFAULT_TERMS } from '../shared/Lease';

export default function Settings() {
  const { owner } = useMe();
  const s = useStore();
  const [tab, setTab] = useState('brand');
  const set = (patch) => s.saveBranding(owner.id, patch);
  const setSettings = (patch) => s.update('owners', owner.id, (o) => ({ settings: { ...o.settings, ...patch } }));
  return (
    <div>
      <PageHeader title="Settings" subtitle="Your brand, payments, business details and rent rules" />
      <Tabs value={tab} onChange={setTab} className="mb-6" tabs={[{ value: 'brand', label: 'Branding', icon: Palette }, { value: 'payments', label: 'Payments', icon: Smartphone }, { value: 'business', label: 'Business', icon: Building2 }, { value: 'rules', label: 'Rent rules', icon: Scale }, { value: 'sms', label: 'SMS', icon: MessageSquare },]} />

      {tab === 'brand' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company name"><Input value={owner.company} onChange={(e) => set({ company: e.target.value })} /></Field>
                <Field label="Tagline"><Input value={owner.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} /></Field>
              </div>
              <div className="mt-5"><LogoPicker value={owner.logo} owner={owner} onChange={(logo) => set({ logo: logo || 'capitalo2-badge.png' })} /></div>
              <p className="mt-2 text-xs text-slate-500">Square logo — used in the menu and as the small logo. The app icon on phones stays the Capital O2 badge.</p>
            </Card>
            <Card className="p-5 sm:p-6">
              <p className="label">Wide logo (receipts, agreements, welcome page)</p>
              <div className="flex flex-wrap items-center gap-4">
                <WideLogo owner={owner} className="h-16" />
                <ImageButton label={owner.logoWide && !owner.logoWide.startsWith('capitalo2-') ? 'Change' : 'Upload'} max={900} onPick={(logoWide) => set({ logoWide })} />
                {owner.logoWide && !owner.logoWide.startsWith('capitalo2-') && <Button size="sm" variant="ghost" onClick={() => set({ logoWide: 'capitalo2-logo.png' })}>Reset</Button>}
              </div>
            </Card>
            <Card className="p-5 sm:p-6">
              <p className="label">Front picture</p>
              <p className="-mt-1 mb-3 text-xs text-slate-500">Shown behind the welcome page, the app start screens and on the dashboard — blended into your colours.</p>
              <div className="relative h-40 overflow-hidden rounded-2xl">
                <img src={heroPhoto(owner)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/60 to-transparent" />
                <p className="absolute bottom-4 left-4 font-display text-xl font-semibold text-white">{owner.tagline || owner.company}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <ImageButton label="Change picture" max={1280} photo onPick={(frontImage) => set({ frontImage })} />
                {owner.frontImage && <Button size="sm" variant="ghost" onClick={() => set({ frontImage: '' })}>Use default</Button>}
              </div>
            </Card>
            <Card className="p-5 sm:p-6"><ColourPicker theme={owner.theme} onChange={(t) => set({ theme: t })} /></Card>
            <Card className="p-5 sm:p-6"><StylePicker theme={owner.theme} onChange={(t) => set({ theme: t })} /></Card>
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="label">Preview</p>
            <BrandPreview owner={owner} />
            <p className="mt-3 text-center text-xs text-slate-500">Changes save automatically and apply for your staff and tenants too.</p>
          </div>
        </div>
      )}

      {tab === 'business' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Contact details" subtitle="Shown on receipts and agreements" icon={Building2} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Contact person"><Input value={owner.contactName} onChange={(e) => set({ contactName: e.target.value })} /></Field>
              <Field label="Phone"><Input value={owner.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="Email" className="sm:col-span-2"><Input value={owner.email} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="Office address / GPS" className="sm:col-span-2"><Input value={owner.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            </div>
          </Card>
          <div className="space-y-6">
            {!LIVE && <Card className="p-5">
              <p className="font-semibold">Reset demo data</p>
              <p className="mt-1 text-xs text-slate-500">Puts all sample data back the way it started. Only affects this browser.</p>
              <Button className="mt-3" variant="soft-red" icon={RotateCcw} onClick={async () => (await confirmDialog('Reset the demo?', 'All changes in this browser are lost.')) && s.resetDemo()}>Reset demo</Button>
            </Card>}
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Late payment" icon={Scale} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Grace period (days)" hint="Days after the due date before rent counts as late"><Input type="number" value={owner.settings.graceDays} onChange={(e) => setSettings({ graceDays: Number(e.target.value) })} /></Field>
              <Field label="Late fee (%)" hint="0 = no late fee. Added once per late bill."><Input type="number" value={owner.settings.lateFeePct} onChange={(e) => setSettings({ lateFeePct: Number(e.target.value) })} /></Field>
              <Field label="Remind tenants (days before due)"><Input type="number" value={owner.settings.reminderDays} onChange={(e) => setSettings({ reminderDays: Number(e.target.value) })} /></Field>
              <label className="flex items-center gap-3 self-end rounded-xl border border-ivory-200 p-3 text-sm dark:border-white/10"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={owner.settings.autoReminders} onChange={(e) => setSettings({ autoReminders: e.target.checked })} /> Send reminders automatically</label>
            </div>
          </Card>
          <Card>
            <CardHeader title="Tenancy agreement terms" subtitle="One clause per line" />
            <div className="space-y-3 p-5">
              <TermsEditor value={owner.settings.leaseTerms} onChange={(v) => setSettings({ leaseTerms: v })} />
              <Button variant="ghost" size="sm" onClick={() => setSettings({ leaseTerms: DEFAULT_TERMS })}>Restore default terms</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'sms' && (
        <Card className="max-w-3xl">
          <CardHeader title="SMS settings" subtitle="Placeholders: {name} {amount} {unit} {due} {ref} {company}" icon={MessageSquare} />
          <div className="space-y-4 p-5">
            <Field label="Sender ID" hint="Up to 11 letters — what tenants see as the sender (needs approval by the SMS provider)"><Input maxLength={11} value={owner.settings.smsSender || ''} onChange={(e) => setSettings({ smsSender: e.target.value })} className="max-w-xs uppercase" /></Field>
            {[['reminder', 'Rent reminder'], ['overdue', 'Overdue notice'], ['receipt', 'Payment receipt'], ['expiry', 'Tenancy ending']].map(([k, l]) => (
              <Field key={k} label={l}><Textarea className="!min-h-[72px]" value={owner.settings.templates[k]} onChange={(e) => setSettings({ templates: { ...owner.settings.templates, [k]: e.target.value } })} /></Field>
            ))}
          </div>
        </Card>
      )}

      {tab === 'payments' && <PaymentsTab />}
    </div>
  );
}

/** Picks an image file, shrinks it and hands back a data URL. */
function ImageButton({ label, onPick, max, photo }) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center rounded-xl bg-brand-50 px-3 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { try { onPick(await readImage(e.target.files[0], max, photo ? 'image/jpeg' : 'image/png')); } catch (err) { toast.error('Picture not added', err.message); } e.target.value = ''; }} />
    </label>
  );
}
