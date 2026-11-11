// Live app: keeps the in-browser store in step with Supabase (schema "capitalo2").
// Reads: everything the signed-in account may see (row-level security decides).
// Writes: ordinary records are upserted; money and accounts go through server functions only.
import { create } from 'zustand';
import { supabase, friendly, must } from '../lib/supabase';
import { useStore, emptyState } from './store';
import { SMS_TEMPLATES } from './seed';
import { DEFAULT_THEME } from '../lib/theme';
import { PHONE_DOMAIN, COMPANY_CODE } from '../config';
import { uid, nowISO } from '../lib/format';
import { toast } from '../components/ui';

/** phase: 'loading' | 'signedOut' | 'noProfile' | 'ready' */
export const useLive = create(() => ({ phase: 'loading', profile: null, email: '', ownerExists: true, brand: null, syncing: false }));
const L = (p) => useLive.setState(p);

export const phoneEmail = (phone) => `0${String(phone).replace(/\D/g, '').slice(-9)}@${PHONE_DOMAIN}`;
export const loginEmail = (id) => (String(id).includes('@') ? String(id).trim().toLowerCase() : phoneEmail(id));
const realEmail = (e) => (e && !e.endsWith(`@${PHONE_DOMAIN}`) ? e : '');

const RECORD_COLS = ['properties', 'units', 'tenants', 'leases', 'invoices', 'payments', 'withdrawals', 'subscriptions', 'maintenance', 'expenses', 'notices', 'sms', 'alerts', 'invites'];
const OWNER_PRIVATE = ['kyc', 'payoutAccounts'];
const OWNER_COLUMNS = { status: 'status', plan: 'plan', planRenews: 'plan_renews', provider: 'provider', code: 'code' };

// ---------------------------------------------------------------- loading
const mapUser = (p) => ({ id: p.user_id, role: p.role, ownerId: p.owner_id, tenantId: p.tenant_id, name: p.name, phone: p.phone || '', email: realEmail(p.email), title: p.title, propertyIds: p.property_ids || [], perms: p.perms || {}, createdAt: p.created_at });
const mapOwner = (o, priv) => ({
  theme: DEFAULT_THEME, payoutAccounts: [], kyc: {}, ...o.data, ...(priv?.data || {}),
  settings: { graceDays: 5, lateFeePct: 0, autoReminders: true, reminderDays: 3, smsSender: '', ...(o.data?.settings || {}), templates: { ...SMS_TEMPLATES, ...(o.data?.settings?.templates || {}) } },
  id: o.id, code: o.code, status: o.status, plan: o.plan, planRenews: o.plan_renews, provider: o.provider, createdAt: o.created_at,
});

async function all(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await must(query().range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

let loading = null;
let again = false;
export async function load() {
  if (loading) { again = true; return loading; }
  loading = (async () => {
    L({ syncing: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { useStore.setState({ ...emptyState(), session: null }); L({ phase: 'signedOut', profile: null }); return; }
      const uidNow = session.user.id;
      const prof = (await must(supabase.from('profiles').select('*').eq('user_id', uidNow)))[0];
      if (!prof) {
        const ownerExists = await must(supabase.rpc('owner_exists'));
        L({ phase: 'noProfile', profile: null, email: session.user.email, ownerExists });
        return;
      }
      if (prof.owner_id) await supabase.rpc('run_billing', { p_owner: prof.owner_id });
      const [cfg, owners, priv, profiles, records] = await Promise.all([
        must(supabase.from('config').select('platform').single()),
        must(supabase.from('owners').select('*')),
        must(supabase.from('owner_private').select('*')),
        must(supabase.from('profiles').select('*')),
        all(() => supabase.from('records').select('owner_id, col, id, data').order('col').order('id')),
      ]);
      const cols = Object.fromEntries(RECORD_COLS.map((c) => [c, []]));
      records.forEach((r) => cols[r.col]?.push({ ...r.data, id: r.id, ownerId: r.owner_id }));
      cols.alerts.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      cols.sms.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      useStore.setState({
        ...cols,
        platform: cfg.platform,
        owners: owners.map((o) => mapOwner(o, priv.find((p) => p.owner_id === o.id))),
        users: profiles.map(mapUser),
        session: { userId: uidNow },
      });
      L({ phase: 'ready', profile: prof });
      subscribe(prof);
    } catch (e) {
      toast.error('Could not load your data', friendly(e));
      if (useLive.getState().phase === 'loading') L({ phase: 'signedOut' });
    } finally {
      L({ syncing: false });
    }
  })();
  await loading;
  loading = null;
  if (again) { again = false; return load(); }
  return null;
}

// Realtime: any change the account may see triggers a quiet reload (debounced).
let channel = null;
let timer = null;
const soon = () => { clearTimeout(timer); timer = setTimeout(load, 900); };
function subscribe(prof) {
  if (channel) return;
  const filter = prof.owner_id ? `owner_id=eq.${prof.owner_id}` : undefined;
  channel = supabase.channel(`capitalo2-${prof.user_id}`)
    .on('postgres_changes', { event: '*', schema: 'capitalo2', table: 'records', ...(filter ? { filter } : {}) }, soon)
    .on('postgres_changes', { event: '*', schema: 'capitalo2', table: 'owners' }, soon)
    .subscribe();
}

// ---------------------------------------------------------------- auth
let started = false;
export function startLive() {
  if (started) return;
  started = true;
  installActions();
  loadBrand();
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { if (channel) { supabase.removeChannel(channel); channel = null; } useStore.setState({ ...emptyState(), session: null }); L({ phase: 'signedOut', profile: null }); }
    if (event === 'SIGNED_IN' && !holding) load();
  });
  load();
}

let holding = false;
/** Runs sign-up steps without the screen jumping ahead between "account created" and "company joined". */
async function hold(fn) {
  holding = true;
  try { return await fn(); } finally { holding = false; }
}

export const signIn = (id, password) => must(supabase.auth.signInWithPassword({ email: loginEmail(id), password }));

async function signUpOrIn(f) {
  const email = f.email?.trim() ? f.email.trim().toLowerCase() : phoneEmail(f.phone);
  const { data, error } = await supabase.auth.signUp({ email, password: f.password, options: { data: { name: f.name, phone: f.phone } } });
  if (error) {
    if (/already registered/i.test(error.message)) return must(supabase.auth.signInWithPassword({ email, password: f.password }));
    throw new Error(friendly(error));
  }
  if (data.session) return data;
  // The email may already have a login on this Supabase project (e.g. from another app): use that password.
  const r = await supabase.auth.signInWithPassword({ email, password: f.password });
  if (r.error) throw new Error('This email already has an account — use its existing password.');
  return r.data;
}

/** Tenant or invited staff: account + join with the company code (matched by phone). */
export const joinCompany = (f) => hold(async () => {
  if (!(await supabase.auth.getSession()).data.session) await signUpOrIn(f);
  const role = await must(supabase.rpc('join_company', { p_code: COMPANY_CODE, p_name: f.name || '', p_phone: f.phone, p_email: f.email || '' }));
  await load();
  return role;
});

/** First-time set-up: the reserved email creates its account and becomes Capital O2's owner. */
export const claimOwner = (f) => hold(async () => {
  if (!(await supabase.auth.getSession()).data.session) await signUpOrIn({ ...f, phone: '' });
  await must(supabase.rpc('claim_owner', { p_name: f.name }));
  await load();
});
export const transferOwner = async (userId) => { await must(supabase.rpc('transfer_owner', { p_user: userId })); await load(); };
/** Capital O2's public brand (logo, colours, front picture) for the screens before sign-in. */
export async function loadBrand() {
  const [{ data }, { data: ownerExists }] = await Promise.all([supabase.rpc('public_brand'), supabase.rpc('owner_exists')]);
  if (data) L({ brand: { ...data, ownerExists: ownerExists !== false } });
  return data;
}
export const signOut = () => supabase.auth.signOut();
export const resetPassword = (email) => must(supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }));

/** Re-checks the password before a withdrawal. */
export async function confirmPassword(password) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: session.user.email, password });
  return !error;
}

// ---------------------------------------------------------------- write-through actions
const fail = (e) => { toast.error('Not saved', friendly(e)); load(); };
const strip = (rec) => { const { id: _i, ownerId: _o, ...data } = rec; return data; }; // eslint-disable-line no-unused-vars

function pushRecord(col, rec) {
  if (!rec?.ownerId) return;
  supabase.from('records').upsert({ owner_id: rec.ownerId, col, id: rec.id, data: strip(rec) }).then(({ error }) => error && fail(error));
}

async function pushOwner(id, patch) {
  const st = useStore.getState();
  const o = st.owners.find((x) => x.id === id);
  const priv = {};
  const cols = {};
  const data = {};
  Object.entries(patch).forEach(([k, v]) => {
    if (OWNER_PRIVATE.includes(k)) priv[k] = v;
    else if (OWNER_COLUMNS[k]) cols[OWNER_COLUMNS[k]] = v;
    else data[k] = v;
  });
  if (Object.keys(data).length || Object.keys(cols).length) {
    const { id: _a, code: _b, status: _c, plan: _d, planRenews: _e, provider: _f, createdAt: _g, kyc: _h, payoutAccounts: _i, ...pub } = { ...o }; // eslint-disable-line no-unused-vars
    const { error } = await supabase.from('owners').update({ ...cols, data: { ...pub, ...data } }).eq('id', id);
    if (error) throw error;
  }
  if (Object.keys(priv).length) {
    const { error } = await supabase.from('owner_private').upsert({ owner_id: id, data: { kyc: o.kyc || {}, payoutAccounts: o.payoutAccounts || [], ...priv } });
    if (error) throw error;
  }
}

function installActions() {
  const base = useStore.getState();
  const set = useStore.setState;
  const get = useStore.getState;
  set({
    login: () => {},
    logout: () => signOut(),
    resetDemo: () => {},

    add: (col, rec) => {
      if (col === 'users') throw new Error('Invite staff instead');
      const r = { id: uid(col.slice(0, 2)), createdAt: nowISO(), ...rec };
      set((s) => ({ [col]: [...s[col], r] }));
      pushRecord(col, r);
      return r;
    },
    update: (col, id, patch) => {
      const cur = get()[col].find((x) => x.id === id);
      if (!cur) return;
      const p = typeof patch === 'function' ? patch(cur) : patch;
      set((s) => ({ [col]: s[col].map((x) => (x.id === id ? { ...x, ...p } : x)) }));
      if (col === 'owners') pushOwner(id, p).catch(fail);
      else if (col === 'users') supabase.rpc('update_member', { p_user: id, p_patch: p, p_remove: false }).then(({ error }) => error && fail(error));
      else pushRecord(col, { ...cur, ...p });
    },
    remove: (col, id) => {
      const cur = get()[col].find((x) => x.id === id);
      set((s) => ({ [col]: s[col].filter((x) => x.id !== id) }));
      if (col === 'users') supabase.rpc('update_member', { p_user: id, p_patch: {}, p_remove: true }).then(({ error }) => error && fail(error));
      else if (cur) supabase.from('records').delete().eq('owner_id', cur.ownerId).eq('col', col).eq('id', id).then(({ error }) => error && fail(error));
    },
    saveBranding: (ownerId, patch) => get().update('owners', ownerId, (o) => ({ ...patch, ...(patch.theme ? { theme: { ...o.theme, ...patch.theme } } : {}) })),

    runBilling: () => {
      const me = get().users.find((u) => u.id === get().session?.userId);
      if (!me?.ownerId) return 0;
      supabase.rpc('run_billing', { p_owner: me.ownerId }).then(({ data, error }) => { if (error) fail(error); else if (data) load(); });
      return 0;
    },
    signLease: (leaseId, _who, name, image) => supabase.rpc('sign_lease', { p_lease: leaseId, p_name: name, p_image: image }).then(({ error }) => (error ? fail(error) : load())),
    recordPayment: async ({ ownerId, tenantId, amount, method, invoiceIds, note }) => {
      const pay = await must(supabase.rpc('record_payment', { p_owner: ownerId, p_tenant: tenantId, p_amount: amount, p_method: method, p_invoice_ids: invoiceIds || [], p_note: note || '' }));
      load();
      return pay;
    },
    sendSms: (ownerId, recipients, text, kind = 'custom') => {
      supabase.rpc('queue_sms', { p_owner: ownerId, p_recipients: recipients, p_text: text || '', p_kind: kind }).then(({ error }) => (error ? fail(error) : soon()));
      return recipients.length;
    },
    notify: () => {},
    readAlerts: (ownerId) => get().alerts.filter((a) => a.ownerId === ownerId && !a.read).forEach((a) => get().update('alerts', a.id, { read: true })),
    reportRepair: async (f) => { await must(supabase.rpc('report_repair', { p: { title: f.title, category: f.category, priority: f.priority, desc: f.desc, photo: f.photo } })); load(); },
    setPlatform: (patch) => {
      set((s) => ({ platform: { ...s.platform, ...patch } }));
      if ('testMode' in patch) supabase.rpc('set_test_mode', { p_on: !!patch.testMode }).then(({ error }) => error && fail(error));
    },
  });
  return base;
}
