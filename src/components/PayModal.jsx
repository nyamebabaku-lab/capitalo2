// Checkout window: MTN MoMo, Telecel Cash, AT Money or card. Calls `pay({ method, payer, amount }, onUpdate)`
// (see lib/pay.js) and shows the phone prompt, an OTP step (Telecel), a card page link, success or the error.
import { useEffect, useState } from 'react';
import { Smartphone, CreditCard, Loader2, CheckCircle2, XCircle, ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import { Modal, Button, Field, Input, cx } from './ui';
import PayLogo from './PayLogo';
import { money, round2 } from '../lib/format';
import { submitOtp } from '../lib/pay';
import { LIVE } from '../config';
import { useStore } from '../data/store';

export const METHODS = [
  { id: 'mtn', label: 'MTN MoMo', kind: 'momo' },
  { id: 'telecel', label: 'Telecel Cash', kind: 'momo' },
  { id: 'at', label: 'AT Money', kind: 'momo' },
  { id: 'card', label: 'Visa / Mastercard', kind: 'card' },
];

export default function PayModal({ open, onClose, title = 'Payment', subtitle, amount, min = 1, max, editable = true, phone = '', pay, onDone, presets = [], payee, provider }) {
  const testMode = useStore((s) => s.platform.testMode);
  const [method, setMethod] = useState('mtn');
  const [account, setAccount] = useState(phone);
  const [card, setCard] = useState('');
  const [amt, setAmt] = useState(amount);
  const [stage, setStage] = useState('form');
  const [info, setInfo] = useState({});
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (open) { setMethod('mtn'); setAccount(phone); setAmt(amount); setStage('form'); setError(''); setResult(null); setCard(''); setOtp(''); setInfo({}); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = METHODS.find((x) => x.id === method);
  const value = round2(+amt || 0);
  const showCardFields = m.kind === 'card' && (!LIVE || testMode);

  const finish = (r) => {
    if (r?.otp) { setInfo({ id: r.id, message: r.message }); setStage('otp'); return; }
    if (!r?.ok) { setStage('form'); setError(r?.error || 'Payment failed'); return; }
    setResult(r);
    setStage('done');
    onDone?.(r);
  };
  const go = async () => {
    setError('');
    if (value < min - 0.001 || (max != null && value > max + 0.001)) return setError(max != null ? `Enter between ${money(min)} and ${money(max)}` : `Enter at least ${money(min)}`);
    if (m.kind === 'momo' && !/^0\d{9}$/.test(account.replace(/\s/g, ''))) return setError('Enter a 10-digit mobile money number');
    if (showCardFields && card.replace(/\s/g, '').length < 12) return setError('Enter the card number');
    setStage('wait');
    setInfo({});
    const payer = m.kind === 'card' ? (showCardFields ? `•••• ${card.replace(/\s/g, '').slice(-4)}` : 'card') : account.replace(/\s/g, '');
    const r = await pay({ method, payer: m.kind === 'card' && showCardFields ? card.replace(/\s/g, '') : payer, amount: value }, (u) => setInfo((x) => ({ ...x, ...u })));
    finish(r);
    return null;
  };
  const sendOtp = async () => { setStage('wait'); finish(await submitOtp(info.id, otp, (u) => setInfo((x) => ({ ...x, ...u })))); };

  return (
    <Modal open={open} onClose={stage === 'wait' ? () => {} : onClose} title={title} subtitle={subtitle} size="md">
      {stage === 'done' ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><CheckCircle2 className="h-9 w-9" /></div>
          <p className="font-display text-2xl font-semibold text-slate-900 dark:text-white">{money(value)} paid</p>
          <p className="mt-1 text-sm text-slate-500">{m.label} · receipt sent by SMS</p>
          {result?.payment?.ref && <p className="mt-3 rounded-full bg-ivory-200 px-3 py-1 font-mono text-xs dark:bg-white/10">Ref {result.payment.ref}</p>}
          <Button className="mt-6" onClick={onClose}>Done</Button>
        </div>
      ) : stage === 'otp' ? (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{info.message || 'Enter the code sent to your phone'}</p>
          <Input autoFocus inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="mx-auto max-w-[220px] text-center text-2xl font-bold tracking-[.3em]" />
          <Button className="w-full" disabled={otp.length < 4} onClick={sendOtp}>Confirm payment</Button>
        </div>
      ) : stage === 'wait' ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="relative mb-5">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent-400/40" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent-400 text-brand-950">{m.kind === 'card' ? <CreditCard className="h-7 w-7" /> : <Smartphone className="h-7 w-7" />}</span>
          </div>
          {info.stage === 'redirect' ? (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">Finish paying on the secure card page</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">It opened in a new tab. Come back here when you are done — this window updates by itself.</p>
              <a href={info.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Open card page <ExternalLink className="h-3.5 w-3.5" /></a>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900 dark:text-white">{m.kind === 'card' ? 'Confirming with your bank…' : `Approve the prompt on ${account}`}</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">{info.message || (m.kind === 'card' ? 'This takes a few seconds' : `Enter your MoMo PIN to pay ${payee || 'the landlord'}. No prompt? MTN: dial *170# → My Wallet → My Approvals.`)}</p>
            </>
          )}
          <Loader2 className="mt-5 h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((x) => (
              <button key={x.id} type="button" onClick={() => setMethod(x.id)} className={cx('flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-[11px] font-semibold transition', method === x.id ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20 dark:bg-brand-500/10' : 'border-ivory-200 hover:border-brand-300 dark:border-white/10')}>
                <PayLogo method={x.id} className="h-9 w-12" />
                <span className="text-center leading-tight text-slate-700 dark:text-slate-200">{x.label.replace(' / Mastercard', '')}</span>
              </button>
            ))}
          </div>
          <Field label="Amount (GH₵)" hint={max != null ? `Up to ${money(max)} · part-payments are allowed` : undefined}>
            <Input inputMode="decimal" value={amt} disabled={!editable} onChange={(e) => setAmt(e.target.value)} className="text-lg font-bold" />
          </Field>
          {editable && presets.length > 0 && (
            <div className="-mt-2 flex flex-wrap gap-2">
              {presets.map((p) => <button key={p.label} type="button" onClick={() => setAmt(p.value)} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-white/10 dark:text-white">{p.label} · {money(p.value)}</button>)}
            </div>
          )}
          {m.kind === 'momo' && <Field label="Mobile money number"><Input inputMode="tel" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="024 123 4567" /></Field>}
          {showCardFields && <Field label="Card number (test)"><Input inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" /></Field>}
          {m.kind === 'card' && !showCardFields && <p className="rounded-xl bg-ivory-100 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">You’ll enter your card on {provider === 'hubtel' ? 'Hubtel' : 'Paystack'}’s secure page. Capital O2 never sees your card number.</p>}
          {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"><XCircle className="h-4 w-4 shrink-0" /> {error}</p>}
          <Button size="lg" className="w-full" icon={Lock} onClick={go}>Pay {money(value)}</Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {!LIVE || testMode ? 'Test mode — no real money moves. A number ending in 000 or a card ending in 0002 is declined.' : `Secured by ${provider === 'hubtel' ? 'Hubtel' : 'Paystack'}.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
