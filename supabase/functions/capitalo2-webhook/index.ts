// Provider callbacks (no sign-in): Paystack webhooks (signed) and Hubtel callbacks (secret in the URL,
// and every Hubtel payment is re-checked with Hubtel's status API before it is accepted).
import { admin, json, verifyPaystackSignature, hookSecret, hubtel, hubtelStatusUrl } from '../_shared/capitalo2.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams.get('p') || 'paystack';
  const raw = await req.text();
  const db = admin();
  try {
    if (p === 'paystack') {
      if (!(await verifyPaystackSignature(raw, req.headers.get('x-paystack-signature')))) return json({ error: 'bad signature' }, 401);
      const ev = JSON.parse(raw);
      const ref = ev.data?.reference;
      if (ev.event === 'charge.success') {
        const { data: c } = await db.from('checkouts').select('*').eq('id', ref).single();
        if (c && c.status === 'pending' && Math.round(ev.data.amount) === Math.round(Number(c.amount) * 100) && ev.data.currency === 'GHS') await db.rpc('settle_checkout', { p_id: c.id, p_ref: String(ev.data.id) });
      }
      return json({ ok: true });
    }
    if (url.searchParams.get('k') !== (await hookSecret())) return json({ error: 'forbidden' }, 403);
    const ev = JSON.parse(raw || '{}');
    const data = ev.Data || ev.data || {};
    const ref = data.ClientReference || data.clientReference;
    if (p === 'hubtel') {
      const { data: c } = await db.from('checkouts').select('*').eq('id', ref).single();
      if (!c || c.status !== 'pending') return json({ ok: true });
      const s = await hubtel(hubtelStatusUrl(c.id));
      const st = (s.data?.status || s.Data?.Status || '').toLowerCase();
      const amt = Number(s.data?.amount ?? s.Data?.Amount ?? 0);
      if (st === 'paid' && Math.abs(amt - Number(c.amount)) < 0.01) await db.rpc('settle_checkout', { p_id: c.id, p_ref: data.TransactionId || null });
      else if (ev.ResponseCode && ev.ResponseCode !== '0000') await db.rpc('fail_checkout', { p_id: c.id, p_error: data.Description || 'Payment failed' });
      return json({ ok: true });
    }
    return json({ error: 'unknown' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
