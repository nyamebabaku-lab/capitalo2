// Owner chooses which payment provider their tenants pay through (and payouts go out through).
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Smartphone, CreditCard, Landmark, Info } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe } from '../../lib/session';
import { Card, CardHeader, Badge, Button, toast, cx, confirmDialog } from '../../components/ui';
import { providerStatus } from '../../lib/pay';

export const PROVIDERS = [
  {
    id: 'paystack', name: 'Paystack', tag: 'Cards + all MoMo networks',
    color: 'bg-[#011b33] text-[#3bb75e]',
    points: ['MTN MoMo, Telecel Cash, AT Money and Visa/Mastercard', 'Settles to Capital O2’s bank account (T+1)', 'Telecel payers may need to approve a voucher code'],
  },
  {
    id: 'hubtel', name: 'Hubtel', tag: 'Ghana’s MoMo specialist',
    color: 'bg-[#01b2ac] text-white',
    points: ['Direct MoMo prompts on MTN, Telecel and AT', 'Card payments on Hubtel’s checkout page', 'Settles to Capital O2’s Hubtel account'],
  },
];

export function ProviderMark({ id, className }) {
  const p = PROVIDERS.find((x) => x.id === id) || PROVIDERS[0];
  return <span className={cx('inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-extrabold tracking-tight', p.color, className)}>{p.name}</span>;
}

export default function PaymentsTab() {
  const { owner } = useMe();
  const update = useStore((s) => s.update);
  const testMode = useStore((s) => s.platform.testMode);
  const setPlatform = useStore((s) => s.setPlatform);
  const [status, setStatus] = useState({});
  useEffect(() => { providerStatus().then(setStatus); }, []);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader title="How your tenants pay" subtitle="Choose the payment company that collects rent for you" icon={Smartphone} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const on = owner.provider === p.id;
            return (
              <button key={p.id} type="button" onClick={() => { if (!on) { update('owners', owner.id, { provider: p.id }); toast.success(`Tenants now pay through ${p.name}`); } }}
                className={cx('rounded-2xl border p-4 text-left transition', on ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20 dark:bg-brand-500/10' : 'border-ivory-200 hover:border-brand-300 dark:border-white/10')}>
                <div className="flex items-center justify-between gap-2">
                  <ProviderMark id={p.id} />
                  {on ? <Badge tone="brand"><CheckCircle2 className="h-3 w-3" /> In use</Badge> : status[p.id] ? <Badge tone="green">Available</Badge> : <Badge tone="amber"><Clock className="h-3 w-3" /> Coming soon</Badge>}
                </div>
                <p className="mt-3 text-sm font-bold">{p.tag}</p>
                <ul className="mt-2 space-y-1.5">{p.points.map((x) => <li key={x} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />{x}</li>)}</ul>
              </button>
            );
          })}
        </div>
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <p className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-brand-600" /> How the money moves</p>
          <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-3"><Smartphone className="h-5 w-5 shrink-0 text-brand-600" /> Your tenant pays in your app by MoMo or card through {PROVIDERS.find((x) => x.id === owner.provider)?.name}.</li>
            <li className="flex gap-3"><CreditCard className="h-5 w-5 shrink-0 text-brand-600" /> The bill is marked paid and a receipt goes out by SMS straight away.</li>
            <li className="flex gap-3"><Landmark className="h-5 w-5 shrink-0 text-brand-600" /> {PROVIDERS.find((x) => x.id === owner.provider)?.name} pays the money into Capital O2’s own account — no middleman fees.</li>
          </ol>
        </Card>
        <Card className="p-5">
          <p className="flex items-center justify-between gap-3 font-semibold">Test mode <Badge tone={testMode ? 'amber' : 'green'}>{testMode ? 'On — payments simulated' : 'Off — real payments'}</Badge></p>
          <p className="mt-1 text-xs text-slate-500">Keep test mode on until your {PROVIDERS.find((x) => x.id === owner.provider)?.name} keys are connected (status above shows “Available”). Keys are added in Supabase → Edge Functions → Secrets as CAPITALO2_PAYSTACK_SECRET_KEY or CAPITALO2_HUBTEL_API_ID / CAPITALO2_HUBTEL_API_KEY / CAPITALO2_HUBTEL_POS_SALES_ID.</p>
          <Button className="mt-3" variant={testMode ? 'primary' : 'secondary'} disabled={testMode && !status[owner.provider]} onClick={async () => {
            if (testMode && !(await confirmDialog('Switch to real payments?', 'Tenants will be charged real money from now on.', { danger: false, confirmLabel: 'Go live' }))) return;
            setPlatform({ testMode: !testMode }); toast.success(testMode ? 'Real payments are on' : 'Test mode is on');
          }}>{testMode ? 'Go live (real payments)' : 'Back to test mode'}</Button>
        </Card>
      </div>
    </div>
  );
}
