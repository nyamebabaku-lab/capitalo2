// New tenancy form, signature pad and the printable tenancy agreement.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, PenLine, Eraser } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { Modal, Button, Field, Input, Select, Segmented, toast, printElement, Textarea } from '../../components/ui';
import { WideLogo } from '../../components/layout/Logo';
import { CYCLES, cycleLabel, cycleMonths, leaseEnd } from '../../lib/billing';
import { money, fmtDate, today } from '../../lib/format';

export function NewLease({ open, onClose, unitId: presetUnit, tenantId: presetTenant, onDone }) {
  const { owner, user } = useMe();
  const { units, tenants, P, leases } = useData();
  const createLease = useStore((s) => s.createLease);
  const [mode, setMode] = useState('new');
  const [f, setF] = useState({});
  const [nt, setNt] = useState({});
  const vacant = units.filter((u) => u.status === 'vacant' || u.id === presetUnit);
  useEffect(() => {
    if (!open) return;
    const u = units.find((x) => x.id === presetUnit) || vacant[0];
    setMode(presetTenant ? 'existing' : 'new');
    setNt({});
    setF({ unitId: u?.id || '', tenantId: presetTenant || '', start: today(), months: 12, cycle: 'yearly', rent: u?.rent || '', deposit: u?.rent || 0, ownerSign: user.role === 'owner' ? user.name : '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const free = tenants.filter((t) => !leases.some((l) => l.tenantId === t.id && l.status === 'active'));
  const firstBill = f.rent ? Number(f.rent) * (f.cycle === 'term' ? Number(f.months) : cycleMonths({ cycle: f.cycle, months: Number(f.months) })) : 0;

  const save = () => {
    if (!f.unitId) return toast.error('Choose a unit');
    if (mode === 'new' && (!nt.name || !nt.phone)) return toast.error('Tenant name and phone are needed');
    if (mode === 'existing' && !f.tenantId) return toast.error('Choose a tenant');
    if (!(Number(f.rent) > 0)) return toast.error('Enter the monthly rent');
    const l = createLease({ ...f, ownerId: owner.id, tenantId: mode === 'existing' ? f.tenantId : '', newTenant: mode === 'new' ? nt : null });
    toast.success('Tenancy created', 'The first bill was raised and the tenant can sign the agreement in their app.');
    onDone?.(l);
    return onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New tenancy" subtitle="Move a tenant into a unit, set rent terms and raise the first bill" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Create tenancy</Button></>}>
      <div className="space-y-5">
        <Field label="Unit">
          <Select value={f.unitId || ''} onChange={(e) => { const u = units.find((x) => x.id === e.target.value); setF((x) => ({ ...x, unitId: u.id, rent: u.rent, deposit: u.rent })); }} placeholder="Choose a vacant unit…"
            options={vacant.map((u) => ({ value: u.id, label: `${P[u.propertyId]?.name} · ${u.label} — ${u.kind} (${money(u.rent)}/mo${u.perBed ? ` per bed · ${(u.beds || 0) - (u.taken || 0)} of ${u.beds} beds free` : ''})` }))} />
        </Field>
        <div>
          <div className="mb-3 flex items-center justify-between"><span className="label !mb-0">Tenant</span><Segmented options={[{ value: 'new', label: 'New tenant' }, { value: 'existing', label: 'Existing' }]} value={mode} onChange={setMode} /></div>
          {mode === 'new' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name *"><Input value={nt.name || ''} onChange={(e) => setNt({ ...nt, name: e.target.value })} /></Field>
              <Field label="Phone (MoMo) *"><Input inputMode="tel" value={nt.phone || ''} onChange={(e) => setNt({ ...nt, phone: e.target.value })} placeholder="024 123 4567" /></Field>
              <Field label="Ghana Card no."><Input value={nt.ghanaCard || ''} onChange={(e) => setNt({ ...nt, ghanaCard: e.target.value })} placeholder="GHA-000000000-0" /></Field>
              <Field label="Email"><Input value={nt.email || ''} onChange={(e) => setNt({ ...nt, email: e.target.value })} /></Field>
              <Field label="Occupation"><Input value={nt.occupation || ''} onChange={(e) => setNt({ ...nt, occupation: e.target.value })} /></Field>
              <Field label="Emergency contact"><Input value={nt.emergency || ''} onChange={(e) => setNt({ ...nt, emergency: e.target.value })} placeholder="Name · phone" /></Field>
            </div>
          ) : (
            <Select value={f.tenantId} onChange={(e) => set('tenantId', e.target.value)} placeholder="Choose a tenant without a current unit…" options={free.map((t) => ({ value: t.id, label: `${t.name} · ${t.phone}` }))} />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Start date"><Input type="date" value={f.start || ''} onChange={(e) => set('start', e.target.value)} /></Field>
          <Field label="Length"><Select value={f.months} onChange={(e) => set('months', Number(e.target.value))} options={[4, 6, 8, 9, 12, 18, 24, 36].map((m) => ({ value: m, label: m % 12 ? `${m} months${m === 4 ? ' (1 semester)' : m === 8 || m === 9 ? ' (academic year)' : ''}` : `${m / 12} year${m > 12 ? 's' : ''}` }))} /></Field>
          <Field label="Pays"><Select value={f.cycle} onChange={(e) => set('cycle', e.target.value)} options={CYCLES} /></Field>
          <Field label="Rent per month (GH₵)"><Input inputMode="decimal" value={f.rent} onChange={(e) => set('rent', e.target.value)} /></Field>
          <Field label="Security deposit (GH₵)"><Input inputMode="decimal" value={f.deposit} onChange={(e) => set('deposit', e.target.value)} /></Field>
          <Field label="Signed for owner by"><Input value={f.ownerSign || ''} onChange={(e) => set('ownerSign', e.target.value)} placeholder="Your name" /></Field>
        </div>
        {firstBill > 0 && (
          <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            First rent bill: <b>{money(firstBill)}</b> ({cycleLabel(f.cycle).toLowerCase()}){Number(f.deposit) > 0 && <> + deposit <b>{money(f.deposit)}</b></>}. Tenancy ends <b>{f.start ? fmtDate(leaseEnd({ start: f.start, months: Number(f.months) })) : '—'}</b>.
            <p className="mt-1 text-xs opacity-75">Ghana’s Rent Act limits advance rent to 6 months for residential lets — many landlords still agree longer terms; make sure your tenant agrees in writing.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function SignaturePad({ onSave, name: initialName = '' }) {
  const ref = useRef();
  const [name, setName] = useState(initialName);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    let down = false;
    const pos = (e) => { const r = c.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [p.clientX - r.left, p.clientY - r.top]; };
    const start = (e) => { down = true; ctx.beginPath(); ctx.moveTo(...pos(e)); e.preventDefault(); };
    const move = (e) => { if (!down) return; ctx.lineTo(...pos(e)); ctx.stroke(); setDrawn(true); e.preventDefault(); };
    const end = () => { down = false; };
    c.addEventListener('pointerdown', start);
    c.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    return () => { c.removeEventListener('pointerdown', start); c.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
  }, []);
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setDrawn(false); };
  return (
    <div className="space-y-3">
      <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div>
        <span className="label">Sign with your finger or mouse</span>
        <canvas ref={ref} className="h-36 w-full touch-none rounded-xl border-2 border-dashed border-ivory-300 bg-white dark:border-white/10" />
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" icon={Eraser} onClick={clear}>Clear</Button>
        <Button icon={PenLine} disabled={!drawn || !name.trim()} onClick={() => onSave(name.trim(), ref.current.toDataURL('image/png'))}>Sign agreement</Button>
      </div>
    </div>
  );
}

export function LeaseDocument({ lease: given, onClose, signAs }) {
  const s = useStore();
  const lease = s.leases.find((l) => l.id === given.id) || given;
  const signLease = useStore((x) => x.signLease);
  const [signing, setSigning] = useState(false);
  const owner = s.owners.find((o) => o.id === lease.ownerId);
  const tenant = s.tenants.find((t) => t.id === lease.tenantId);
  const unit = s.units.find((u) => u.id === lease.unitId);
  const prop = s.properties.find((p) => p.id === unit?.propertyId);
  const terms = useMemo(() => owner.settings?.leaseTerms || DEFAULT_TERMS, [owner]);
  const mine = signAs === 'tenant' ? lease.signedTenant : lease.signedOwner;
  const Sig = ({ who, sig }) => (
    <div className="flex-1">
      <div className="flex h-20 items-end border-b border-slate-400">{sig?.image ? <img src={sig.image} alt="signature" className="h-16" /> : sig ? <p className="pb-1 font-display text-2xl italic">{sig.name}</p> : <p className="pb-1 text-xs text-slate-400">Not signed yet</p>}</div>
      <p className="mt-1 text-xs font-semibold">{who}</p>
      {sig && <p className="text-[10px] text-slate-500">{sig.name} · {fmtDate(sig.at)}</p>}
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Tenancy agreement" subtitle={lease.no} size="lg"
      footer={<>{signAs && !mine && <Button icon={PenLine} onClick={() => setSigning(true)}>Sign now</Button>}<Button variant="secondary" icon={FileDown} onClick={() => printElement('lease-doc', `Tenancy ${lease.no}`)}>PDF</Button></>}>
      <div id="lease-doc" className="text-[13px] leading-relaxed text-slate-800">
        <div className="mb-4 flex items-center gap-3 border-b-2 border-brand-600 pb-3">
          <WideLogo owner={owner} />
          <div className="flex-1 text-right"><p className="font-display text-lg font-semibold">{owner.company}</p><p className="text-xs text-slate-500">{owner.address} · {owner.phone}</p><p className="font-mono text-xs">{lease.no}</p></div>

        </div>
        <h3 className="mb-3 text-center font-display text-xl font-semibold uppercase tracking-wide">Tenancy Agreement</h3>
        <p>This agreement is made on <b>{fmtDate(lease.createdAt || lease.start)}</b> between <b>{owner.company}</b> (“the Landlord”) and <b>{tenant?.name}</b>{tenant?.ghanaCard ? <> (Ghana Card {tenant.ghanaCard})</> : ''} (“the Tenant”).</p>
        <table className="my-4 w-full text-sm">
          <tbody>
            {[['Premises', `${lease.bed ? `Bed ${lease.bed}, ` : ''}${unit?.label} (${unit?.kind}), ${prop?.name}, ${prop?.address}${prop?.gps ? ` · ${prop.gps}` : ''}`], ['Term', `${lease.months} months from ${fmtDate(lease.start)} to ${fmtDate(leaseEnd(lease))}`], ['Rent', `${money(lease.rent)} per month, payable ${cycleLabel(lease.cycle).toLowerCase()}`], ['Security deposit', money(lease.deposit)], ['Payment', 'Mobile money, card or bank through the Capital O2 Hostel app, or as agreed in writing']].map(([k, v]) => (
              <tr key={k} className="border-b border-ivory-200"><td className="w-40 py-2 pr-3 font-semibold">{k}</td><td className="py-2">{v}</td></tr>
            ))}
          </tbody>
        </table>
        <ol className="list-decimal space-y-1.5 pl-5">{terms.split('\n').filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}</ol>
        <div className="mt-8 flex gap-8"><Sig who="For the Landlord" sig={lease.signedOwner} /><Sig who="Tenant" sig={lease.signedTenant} /></div>
        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-slate-400">Signed electronically · {owner.company}</p>
      </div>
      <Modal open={signing} onClose={() => setSigning(false)} title="Sign the agreement" size="sm">
        <SignaturePad name={signAs === 'tenant' ? tenant?.name : owner.contactName} onSave={(n, img) => { signLease(lease.id, signAs, n, img); setSigning(false); toast.success('Agreement signed', 'A copy is saved in your account.'); }} />
      </Modal>
    </Modal>
  );
}

export const DEFAULT_TERMS = `The Tenant shall pay rent on or before the due date. A late fee may apply after the grace period set by the Landlord.
The Tenant shall use the premises for the agreed purpose only and shall not sublet without written consent.
The Tenant shall keep the premises clean and report any damage or repairs promptly through the app.
Utility bills (electricity, water, waste) are the Tenant’s responsibility unless stated otherwise.
The Landlord shall carry out structural repairs and keep common areas in good condition.
Either party may end this tenancy by giving at least three (3) months’ written notice, or as agreed.
The security deposit will be refunded at the end of the tenancy, less the cost of any damage beyond fair wear and tear.
This agreement is governed by the Rent Act, 1963 (Act 220) of Ghana.`;

export function TermsEditor({ value, onChange }) {
  return <Textarea className="min-h-[220px] font-mono text-xs" value={value || DEFAULT_TERMS} onChange={(e) => onChange(e.target.value)} />;
}
