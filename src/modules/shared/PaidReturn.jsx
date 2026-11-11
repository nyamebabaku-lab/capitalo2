// Where Paystack / Hubtel send people back after a card payment: checks the result, then goes home.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, Button } from '../../components/ui';
import { load } from '../../data/live';
import { money } from '../../lib/format';

export default function PaidReturn() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [st, setSt] = useState({ status: 'pending' });
  useEffect(() => {
    const id = params.get('ck');
    let stop = false;
    (async () => {
      for (let i = 0; i < 30 && !stop; i++) {
        try { await supabase.functions.invoke('capitalo2-pay', { body: { action: 'verify', id } }); } catch { /* keep polling */ }
        const { data } = await supabase.rpc('checkout_status', { p_id: id });
        if (data && data.status !== 'pending') { setSt(data); load(); return; }
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => { stop = true; };
  }, [params]);
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      {st.status === 'pending' ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" /> : st.status === 'success' ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <XCircle className="mx-auto h-12 w-12 text-red-500" />}
      <h1 className="mt-4 font-display text-2xl font-semibold">{st.status === 'pending' ? 'Confirming your payment…' : st.status === 'success' ? 'Payment successful' : 'Payment not completed'}</h1>
      <p className="mt-2 text-sm text-slate-500">{st.status === 'success' ? `${money(st.payment?.amount || 0)} received · receipt ${st.payment?.ref || ''}` : st.error || 'This can take a few seconds.'}</p>
      {st.status !== 'pending' && <Button className="mt-6" onClick={() => nav('/')}>Continue</Button>}
    </Card>
  );
}
