// Online payments (MoMo / card) for rent and plans.
// Demo: simulated in the browser. Live: a server checkout → Paystack or Hubtel (or the server's test mode) → settled
// on the server, never by the app. A MoMo number ending in 000 or a card ending in 0002 is declined in test mode.
import { LIVE } from '../config';
import { supabase, friendly } from './supabase';
import { useStore } from '../data/store';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke('capitalo2-pay', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  if (data?.error && !data.status) throw new Error(data.error);
  return data;
}

async function demoPay({ ownerId, tenantId, amount, method, payer, invoiceIds, plan, by }) {
  await wait(2600);
  if (method === 'card' ? payer.endsWith('0002') : payer.endsWith('000')) return { ok: false, error: method === 'card' ? 'Card declined by your bank.' : 'The MoMo prompt was declined or timed out.' };
  const s = useStore.getState();
  if (plan) { s.changePlan(ownerId, plan, { method }); return { ok: true }; }
  const payment = s.recordPayment({ ownerId, tenantId, amount, method, invoiceIds, by, payer });
  return { ok: true, payment };
}

/** Polls the server until the checkout settles (or ~3 minutes pass). */
async function poll(id, onUpdate) {
  for (let i = 0; i < 45; i++) {
    await wait(i < 5 ? 3000 : 4000);
    let r;
    try { r = await invoke({ action: 'verify', id }); } catch { r = null; }
    if (!r || r.status === 'pending') {
      const { data } = await supabase.rpc('checkout_status', { p_id: id });
      if (data?.status === 'success') return { ok: true, payment: data.payment };
      if (data?.status === 'failed') return { ok: false, error: data.error || 'Payment failed' };
      onUpdate?.({ stage: 'wait' });
      continue;
    }
    if (r.status === 'success') {
      const { data } = await supabase.rpc('checkout_status', { p_id: id });
      return { ok: true, payment: data?.payment || r.payment };
    }
    if (r.status === 'failed') return { ok: false, error: r.error || 'Payment failed' };
  }
  return { ok: false, error: 'We did not get a confirmation yet. If money left your account, it will show here once the provider confirms.' };
}

/**
 * Starts a payment. Returns { ok, payment } | { ok:false, error } | { otp: true, id, message } (Telecel via Paystack).
 * onUpdate({ stage, message, url }) reports progress for the payment window.
 */
export async function payOnline(p, onUpdate) {
  if (!LIVE) return demoPay(p);
  try {
    const { data: c, error } = await supabase.rpc('start_checkout', { p_owner: p.ownerId, p_tenant: p.tenantId || null, p_amount: p.amount, p_method: p.method, p_payer: p.payer, p_invoice_ids: p.invoiceIds || [], p_plan: p.plan || null });
    if (error) return { ok: false, error: friendly(error) };
    if (c.test) {
      await wait(2500);
      const { data, error: e2 } = await supabase.rpc('confirm_test_checkout', { p_id: c.id });
      if (e2) return { ok: false, error: friendly(e2) };
      return data.status === 'success' ? { ok: true, payment: data.payment, test: true } : { ok: false, error: data.error };
    }
    const r = await invoke({ action: 'charge', id: c.id });
    if (r.status === 'failed') return { ok: false, error: r.error || 'Payment failed' };
    if (r.status === 'success') return poll(c.id, onUpdate);
    if (r.status === 'need_otp') return { otp: true, id: c.id, message: r.message };
    if (r.status === 'redirect') {
      onUpdate?.({ stage: 'redirect', url: r.url });
      window.open(r.url, '_blank', 'noopener');
    } else onUpdate?.({ stage: 'wait', message: r.message });
    return poll(c.id, onUpdate);
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

export async function submitOtp(id, otp, onUpdate) {
  try {
    const r = await invoke({ action: 'otp', id, otp });
    if (r.status === 'failed') return { ok: false, error: r.error };
    onUpdate?.({ stage: 'wait', message: r.message });
    return poll(id, onUpdate);
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/** Which providers the platform has connected (live) — the demo pretends both are. */
export async function providerStatus() {
  if (!LIVE) return { paystack: true, hubtel: true, hubtelPayouts: true, sms: true, demo: true };
  try { return await invoke({ action: 'providers' }); } catch { return {}; }
}
