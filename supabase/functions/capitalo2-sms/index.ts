// Sends one queued SMS (called by the database trigger with the hook secret).
// Without an mNotify key the message is marked "simulated" so the app still works.
import { admin, json, env, hookSecret, local } from '../_shared/capitalo2.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-hook-secret') !== (await hookSecret())) return json({ error: 'forbidden' }, 403);
  const { owner, id } = await req.json();
  const db = admin();
  const { data: rec } = await db.from('records').select('data').eq('owner_id', owner).eq('col', 'sms').eq('id', id).single();
  if (!rec || rec.data.status !== 'queued') return json({ ok: true });
  const set = (patch: Record<string, unknown>) => db.from('records').update({ data: { ...rec.data, ...patch } }).eq('owner_id', owner).eq('col', 'sms').eq('id', id);
  const key = env('CAPITALO2_MNOTIFY_API_KEY');
  if (!key) { await set({ status: 'simulated' }); return json({ ok: true, simulated: true }); }
  const { data: o } = await db.from('owners').select('data').eq('id', owner).single();
  const sender = (env('CAPITALO2_MNOTIFY_SENDER_ID') || o?.data?.settings?.smsSender || 'CAPITAL O2').slice(0, 11);
  try {
    const r = await fetch(`https://api.mnotify.com/api/sms/quick?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ recipient: [local(rec.data.to)], sender, message: rec.data.text, is_schedule: false, schedule_date: '' }) });
    const j = await r.json().catch(() => ({}));
    await set(j.status === 'success' ? { status: 'sent', sender } : { status: 'failed', error: j.message || `mNotify ${r.status}` });
    return json({ ok: true });
  } catch (e) {
    await set({ status: 'failed', error: (e as Error).message });
    return json({ ok: false }, 500);
  }
});
