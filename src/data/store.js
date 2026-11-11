// One Zustand store for both apps. The demo keeps everything in the browser; the live app starts empty,
// loads from Supabase (data/live.js) and replaces the actions that must run on the server.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import { addMonths, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { buildSeed } from './seed';
import { leaseInvoices, allocate, ONLINE, balance, wallet, payoutFee, leaseEnd } from '../lib/billing';
import { uid, round2, nowISO, today } from '../lib/format';
import { DEFAULT_THEME } from '../lib/theme';
import { LIVE } from '../config';
import { PLATFORM } from './seed';

const COLS = ['owners', 'users', 'properties', 'units', 'tenants', 'leases', 'invoices', 'payments', 'withdrawals', 'subscriptions', 'maintenance', 'expenses', 'notices', 'sms', 'alerts'];
const code6 = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
const ref = (p = 'EW') => `${p}${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

const fill = (tpl, vars) => (tpl || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
export const emptyState = () => ({ platform: PLATFORM, ...Object.fromEntries([...COLS, 'invites'].map((c) => [c, []])) });

export const useStore = create(
  persist(
    (set, get) => ({
      ...(LIVE ? emptyState() : { ...buildSeed(), invites: [] }),
      session: null, // { userId }
      lastBilling: null,

      // ---------- session ----------
      login: (userId) => {
        if (typeof window !== 'undefined') window.location.hash = '#/';
        set({ session: { userId } });
      },
      logout: () => set({ session: null }),
      resetDemo: () => set({ ...buildSeed(), invites: [], session: null, lastBilling: null }),

      // ---------- generic ----------
      add: (col, rec) => {
        const r = { id: uid(col.slice(0, 2)), createdAt: nowISO(), ...rec };
        set((s) => ({ [col]: [...s[col], r] }));
        return r;
      },
      update: (col, id, patch) => set((s) => ({ [col]: s[col].map((x) => (x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)) })),
      remove: (col, id) => set((s) => ({ [col]: s[col].filter((x) => x.id !== id) })),

      // ---------- owners ----------
      registerOwner: (f) => {
        const ownerId = uid('own');
        const owner = {
          id: ownerId, company: f.company || '', contactName: f.name, phone: f.phone, email: f.email, address: f.address || '', status: 'pending', plan: 'starter', setupDone: false, code: code6(), createdAt: nowISO(),
          logo: '', theme: { ...DEFAULT_THEME }, kyc: { ghanaCard: f.ghanaCard || '', businessReg: f.businessReg || '', tin: '' }, payoutAccounts: [],
          settings: { ...get().owners[0].settings, smsSender: '' },
        };
        const user = { id: uid('usr'), role: 'owner', ownerId, name: f.name, phone: f.phone, email: f.email, title: 'Owner' };
        set((s) => ({ owners: [...s.owners, owner], users: [...s.users, user], session: { userId: user.id } }));
        return owner;
      },
      saveBranding: (ownerId, patch) => get().update('owners', ownerId, (o) => ({ ...patch, theme: { ...o.theme, ...(patch.theme || {}) } })),

      // ---------- leases & billing ----------
      createLease: (f) => {
        const s = get();
        let tenantId = f.tenantId;
        if (!tenantId) tenantId = s.add('tenants', { ownerId: f.ownerId, ...f.newTenant }).id;
        const unit = s.units.find((u) => u.id === f.unitId);
        // Shared rooms let per bed: give the tenant the first free bed; the room is "occupied" only when every bed is taken.
        const roomLeases = s.leases.filter((l) => l.unitId === f.unitId && l.status === 'active');
        let bed;
        if (unit?.perBed) for (let b = 1; b <= (Number(unit.beds) || 1); b++) if (!roomLeases.some((l) => l.bed === b)) { bed = b; break; }
        const lease = s.add('leases', { ownerId: f.ownerId, unitId: f.unitId, propertyId: unit?.propertyId, tenantId, bed, start: f.start, months: Number(f.months), cycle: f.cycle, rent: Number(f.rent), deposit: Number(f.deposit) || 0, status: 'active', no: `TA-${format(new Date(), 'yy')}-${String(s.leases.length + 1).padStart(4, '0')}`, signedOwner: f.ownerSign ? { name: f.ownerSign, at: nowISO() } : null, signedTenant: null, notes: f.notes || '' });
        if (unit?.perBed) {
          const taken = roomLeases.length + 1;
          s.update('units', f.unitId, { taken, status: taken >= (Number(unit.beds) || 1) ? 'occupied' : 'vacant' });
        } else s.update('units', f.unitId, { status: 'occupied' });
        if (s.tenants.find((t) => t.id === tenantId)?.former) s.update('tenants', tenantId, { former: false });
        get().runBilling();
        return lease;
      },
      endLease: (leaseId, { date = today(), refund = '' } = {}) => {
        const s = get();
        const l = s.leases.find((x) => x.id === leaseId);
        s.update('leases', leaseId, { status: 'ended', endedOn: date, refund });
        const u = s.units.find((x) => x.id === l.unitId);
        if (u?.perBed) s.update('units', l.unitId, { status: 'vacant', taken: Math.max(0, s.leases.filter((x) => x.unitId === l.unitId && x.status === 'active' && x.id !== leaseId).length) });
        else s.update('units', l.unitId, { status: 'vacant' });
        if (!s.leases.some((o) => o.id !== leaseId && o.tenantId === l.tenantId && o.status === 'active')) s.update('tenants', l.tenantId, { former: true });
        // Drop unpaid bills due after the move-out date.
        s.invoices.filter((i) => i.leaseId === leaseId && i.due > date && !i.paid).forEach((i) => s.update('invoices', i.id, { void: true }));
      },
      renewLease: (leaseId, { months, rent, cycle }) => {
        const s = get();
        const l = s.leases.find((x) => x.id === leaseId);
        const start = format(addMonths(parseISO(l.start), l.months), 'yyyy-MM-dd');
        const { id: _old, ...rest } = l; // eslint-disable-line no-unused-vars
        const n = s.add('leases', { ...rest, start, months: Number(months), rent: Number(rent), cycle, deposit: 0, status: 'active', endedOn: null, renewedBy: null, no: `${l.no}-R`, signedTenant: null, signedOwner: null, renewedFrom: l.id });
        // The old tenancy keeps running (and billing) until its end date; runBilling closes it then.
        s.update('leases', leaseId, { renewedBy: n.id });
        get().runBilling();
        return n;
      },
      signLease: (leaseId, who, name, image) => get().update('leases', leaseId, { [who === 'tenant' ? 'signedTenant' : 'signedOwner']: { name, image, at: nowISO() } }),

      /** Creates any rent invoices that have come due (idempotent) and late fees on overdue rent. */
      runBilling: () => {
        const done = get().leases.filter((l) => l.status === 'active' && l.renewedBy && leaseEnd(l) < today());
        if (done.length) set((st) => ({ leases: st.leases.map((l) => (done.some((x) => x.id === l.id) ? { ...l, status: 'ended', endedOn: leaseEnd(l) } : l)) }));
        const s = get();
        const have = new Set(s.invoices.map((i) => i.id));
        const fresh = [];
        s.leases.filter((l) => l.status === 'active').forEach((l) => {
          const unit = s.units.find((u) => u.id === l.unitId);
          leaseInvoices(l, unit).forEach((inv) => !have.has(inv.id) && fresh.push(inv));
        });
        const lateFees = [];
        s.invoices.forEach((inv) => {
          if (inv.kind !== 'rent' || inv.void || balance(inv) <= 0 || have.has(`${inv.id}_late`)) return;
          const o = s.owners.find((x) => x.id === inv.ownerId);
          const pctFee = o?.settings?.lateFeePct || 0;
          if (!pctFee) return;
          const lateBy = differenceInCalendarDays(new Date(), parseISO(inv.due));
          if (lateBy > (o.settings.graceDays ?? 5) && lateBy <= 90)
            lateFees.push({ ...inv, id: `${inv.id}_late`, kind: 'late', title: `Late fee · ${inv.title}`, amount: round2((balance(inv) * pctFee) / 100), paid: 0, issued: today(), due: today() });
        });
        if (fresh.length || lateFees.length) set((st) => ({ invoices: [...st.invoices, ...fresh, ...lateFees] }));
        set({ lastBilling: nowISO() });
        return fresh.length + lateFees.length;
      },

      addBill: (f) => {
        const s = get();
        const l = s.leases.find((x) => x.id === f.leaseId);
        const u = s.units.find((x) => x.id === l.unitId);
        return s.add('invoices', { ownerId: l.ownerId, leaseId: l.id, tenantId: l.tenantId, unitId: l.unitId, propertyId: u.propertyId, kind: f.kind, title: f.title, amount: Number(f.amount), due: f.due, issued: today(), paid: 0 });
      },

      /** Records a payment and spreads it over the tenant's open invoices (or the chosen ones). */
      recordPayment: ({ ownerId, tenantId, amount, method, invoiceIds, by, payer, note }) => {
        const s = get();
        const all = s.invoices.filter((i) => i.tenantId === tenantId && !i.void && balance(i) > 0);
        const byDue = (a, b) => a.due.localeCompare(b.due);
        let open = (invoiceIds?.length ? all.filter((i) => invoiceIds.includes(i.id)) : all).sort(byDue);
        // Paying more than the chosen bills covers the others too (oldest first, chosen ones first).
        if (amount > open.reduce((a, i) => a + balance(i), 0)) open = [...open, ...all.filter((i) => !open.includes(i)).sort(byDue)];
        const { allocations, credit } = allocate(amount, open, true);
        const online = ONLINE.includes(method);
        const fee = online ? round2((amount * s.platform.feePct) / 100) : 0;
        const first = open.find((i) => i.id === allocations[0]?.invoiceId) || s.invoices.find((i) => i.tenantId === tenantId);
        const pay = { id: uid('pay'), ownerId, tenantId, unitId: first?.unitId, propertyId: first?.propertyId, amount: round2(amount), fee, net: round2(amount - fee), method, online, ref: ref(), at: nowISO(), allocations, credit, by, payer, note, test: s.platform.testMode };
        set((st) => ({
          payments: [...st.payments, pay],
          invoices: st.invoices.map((i) => {
            const a = allocations.find((x) => x.invoiceId === i.id);
            return a ? { ...i, paid: round2((i.paid || 0) + a.amount) } : i;
          }),
        }));
        const t = s.tenants.find((x) => x.id === tenantId);
        const o = s.owners.find((x) => x.id === ownerId);
        const unit = s.units.find((u) => u.id === pay.unitId);
        if (t?.phone) get().sendSms(ownerId, [{ phone: t.phone, name: t.name }], fill(o.settings.templates.receipt, { name: t.name.split(' ')[0], amount: `GH₵ ${pay.amount.toFixed(2)}`, unit: unit?.label || '', ref: pay.ref, company: o.company }), 'receipt');
        get().notify(ownerId, { title: `${t?.name} paid GH₵ ${pay.amount.toFixed(2)}`, text: `${unit?.label || ''} · ${pay.ref}`, kind: 'payment' });
        return pay;
      },

      // ---------- wallet ----------
      requestWithdrawal: ({ ownerId, amount, accountId, by }) => {
        const s = get();
        const o = s.owners.find((x) => x.id === ownerId);
        const acc = o.payoutAccounts.find((a) => a.id === accountId);
        const w = wallet(s, ownerId);
        if (amount > w.balance) throw new Error('Amount is more than your available balance.');
        if (amount < s.platform.minWithdraw) throw new Error(`The minimum withdrawal is GH₵ ${s.platform.minWithdraw}.`);
        const needsApproval = amount > s.platform.autoLimit || o.status !== 'approved';
        const dest = acc.kind === 'bank' ? `${acc.bank} •••${acc.number.slice(-4)}` : `${{ mtn: 'MTN MoMo', telecel: 'Telecel Cash', at: 'AT Money' }[acc.network]} ${acc.number.slice(0, 3)}•••${acc.number.slice(-4)}`;
        const rec = { id: uid('wd'), ownerId, amount: round2(amount), fee: payoutFee(s.platform, acc.kind), accountId, dest, status: needsApproval ? 'pending' : 'processing', at: nowISO(), ref: ref('PO'), by, needsApproval, test: s.platform.testMode };
        set((st) => ({ withdrawals: [...st.withdrawals, rec] }));
        if (!needsApproval) setTimeout(() => get().update('withdrawals', rec.id, { status: 'paid', paidAt: nowISO() }), 3500);
        return rec;
      },
      decideWithdrawal: (id, ok, reason = '') => {
        get().update('withdrawals', id, ok ? { status: 'processing', approvedAt: nowISO() } : { status: 'rejected', reason });
        if (ok) setTimeout(() => get().update('withdrawals', id, { status: 'paid', paidAt: nowISO() }), 3000);
        const w = get().withdrawals.find((x) => x.id === id);
        get().notify(w.ownerId, { title: ok ? 'Withdrawal approved' : 'Withdrawal declined', text: ok ? `GH₵ ${w.amount.toFixed(2)} is on its way to ${w.dest}` : reason, kind: 'wallet' });
      },

      changePlan: (ownerId, planId, { fromWallet, method } = {}) => {
        const s = get();
        const plan = s.platform.plans.find((p) => p.id === planId);
        get().update('owners', ownerId, { plan: planId, planRenews: format(addMonths(new Date(), 1), 'yyyy-MM-dd') });
        if (plan.price > 0) get().add('subscriptions', { ownerId, plan: planId, amount: plan.price, at: nowISO(), method: fromWallet ? 'wallet' : method, fromWallet: !!fromWallet });
      },

      reportRepair: (f) => {
        const s = get();
        const u = s.units.find((x) => x.id === f.unitId);
        const t = s.tenants.find((x) => x.id === f.tenantId);
        const r = s.add('maintenance', { ...f, propertyId: u?.propertyId, status: 'open', at: nowISO(), updates: [], assignee: '' });
        s.notify(f.ownerId, { title: `New repair request: ${f.title}`, text: `${t?.name} · ${u?.label}`, kind: 'maintenance' });
        return r;
      },
      setOwnerStatus: (ownerId, status) => {
        get().update('owners', ownerId, { status });
        get().notify(ownerId, { title: status === 'approved' ? 'Your account is verified 🎉' : status === 'suspended' ? 'Your account was suspended' : 'Account updated', text: status === 'approved' ? 'Online rent and withdrawals are now switched on.' : '', kind: 'account' });
      },
      setPlatform: (patch) => set((s) => ({ platform: { ...s.platform, ...patch } })),

      // ---------- messages ----------
      sendSms: (ownerId, recipients, text, kind = 'custom') => {
        const at = nowISO();
        const recs = recipients.map((r) => ({ id: uid('sms'), ownerId, to: r.phone, name: r.name, kind, text: r.text || text, at, status: 'delivered', test: true }));
        set((s) => ({ sms: [...recs, ...s.sms] }));
        return recs.length;
      },
      notify: (ownerId, n) => set((s) => ({ alerts: [{ id: uid('al'), ownerId, at: nowISO(), read: false, ...n }, ...s.alerts].slice(0, 80) })),
      readAlerts: (ownerId) => set((s) => ({ alerts: s.alerts.map((a) => (a.ownerId === ownerId ? { ...a, read: true } : a)) })),
    }),
    {
      name: LIVE ? 'capitalo2-live' : 'capitalo2-demo',
      storage: createJSONStorage(() => idbStorage),
      version: 1,
      // The live app never caches account data in the browser; the server is the source of truth.
      partialize: (s) => (LIVE ? {} : Object.fromEntries([...COLS, 'invites', 'platform', 'session', 'lastBilling'].map((k) => [k, s[k]]))),
    },
  ),
);

export const fillTemplate = fill;
