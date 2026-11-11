// Rent billing: lease cycles → invoices, invoice status, payment allocation, wallet maths.
import { addMonths, addDays, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { round2, sum } from './format';

export const CYCLES = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Quarterly (3 months)', months: 3 },
  { value: 'biannual', label: 'Every 6 months', months: 6 },
  { value: 'yearly', label: 'Yearly (1 year advance)', months: 12 },
  { value: 'semester', label: 'Per semester (4 months)', months: 4 },
  { value: 'academic', label: 'Per academic year (whole stay)', months: 0 },
  { value: 'term', label: 'Whole term in advance', months: 0 },
];
export const cycleLabel = (c) => CYCLES.find((x) => x.value === c)?.label || c;
export const cycleMonths = (lease) => (['term', 'academic'].includes(lease.cycle) ? lease.months : CYCLES.find((x) => x.value === lease.cycle)?.months || 1);

const key = (d) => format(d, 'yyyy-MM-dd');
export const leaseEnd = (lease) => key(addDays(addMonths(parseISO(lease.start), lease.months), -1));
export const daysLeft = (lease) => differenceInCalendarDays(parseISO(leaseEnd(lease)), new Date());

/** How many days before a rent period starts its invoice is issued. */
export const ISSUE_AHEAD_DAYS = 14;

/** All rent invoices a lease should have up to `asOf` (issued ISSUE_AHEAD_DAYS before each period). */
export function leaseInvoices(lease, unit, asOf = new Date()) {
  const out = [];
  const step = cycleMonths(lease);
  const start = parseISO(lease.start);
  const end = addMonths(start, lease.months);
  const horizon = addDays(asOf, ISSUE_AHEAD_DAYS);
  if (lease.deposit > 0)
    out.push({ id: `inv_${lease.id}_dep`, kind: 'deposit', title: 'Security deposit', periodStart: lease.start, periodEnd: lease.start, amount: lease.deposit, due: lease.start, issued: lease.start });
  const lastDay = lease.endedOn ? parseISO(lease.endedOn) : end;
  for (let i = 0, p = start; p < end && p <= horizon && p <= lastDay; i++, p = addMonths(start, step * (i))) {
    const pEnd = addMonths(p, step) > end ? end : addMonths(p, step);
    const months = Math.round((pEnd - p) / (1000 * 60 * 60 * 24 * 30.44));
    out.push({
      id: `inv_${lease.id}_${i}`,
      kind: 'rent',
      title: `Rent ${format(p, 'MMM yyyy')}${months > 1 ? ` – ${format(addDays(pEnd, -1), 'MMM yyyy')}` : ''}`,
      periodStart: key(p),
      periodEnd: key(addDays(pEnd, -1)),
      months,
      amount: round2(lease.rent * months),
      due: key(p),
      issued: key(addDays(p, -ISSUE_AHEAD_DAYS)),
    });
  }
  return out.map((inv) => ({ ...inv, ownerId: lease.ownerId, leaseId: lease.id, tenantId: lease.tenantId, unitId: lease.unitId, propertyId: unit?.propertyId, paid: 0 }));
}

export const balance = (inv) => round2(inv.amount - (inv.paid || 0));
export function invoiceStatus(inv, now = new Date()) {
  if (inv.void) return 'void';
  if (balance(inv) <= 0.001) return 'paid';
  const late = differenceInCalendarDays(now, parseISO(inv.due)) > 0;
  if (inv.paid > 0) return late ? 'overdue' : 'partial';
  if (late) return 'overdue';
  return differenceInCalendarDays(parseISO(inv.due), now) > 0 ? 'upcoming' : 'due';
}
export const STATUS_TONE = { paid: 'green', partial: 'amber', overdue: 'red', due: 'brand', upcoming: 'slate', void: 'slate', pending: 'amber', approved: 'brand', processing: 'sky', rejected: 'red', failed: 'red', active: 'green', ended: 'slate', expiring: 'amber', suspended: 'red', open: 'red', assigned: 'amber', 'in progress': 'sky', done: 'green' };

/** Spreads a payment over invoices, oldest due first. Returns [{ invoiceId, amount }] and leftover credit. */
export function allocate(amount, invoices, keepOrder = false) {
  let left = round2(amount);
  const allocations = [];
  const list = invoices.filter((i) => balance(i) > 0 && !i.void);
  (keepOrder ? list : [...list].sort((a, b) => a.due.localeCompare(b.due))).forEach((inv) => {
    if (left <= 0) return;
    const take = Math.min(left, balance(inv));
    allocations.push({ invoiceId: inv.id, amount: round2(take) });
    left = round2(left - take);
  });
  return { allocations, credit: left };
}

export const ONLINE = ['mtn', 'telecel', 'at', 'card'];
export const METHOD_LABEL = { mtn: 'MTN MoMo', telecel: 'Telecel Cash', at: 'AT Money', card: 'Card', cash: 'Cash', bank: 'Bank deposit', cheque: 'Cheque', momo_direct: 'MoMo (to owner)', wallet: 'Wallet' };

/** Owner wallet: online rent (net of fee) in, payouts and plan charges out. */
export function wallet(state, ownerId) {
  const pays = state.payments.filter((p) => p.ownerId === ownerId && p.online);
  const credits = sum(pays, (p) => p.net);
  const outs = state.withdrawals.filter((w) => w.ownerId === ownerId && w.status !== 'rejected' && w.status !== 'failed');
  const charges = state.subscriptions.filter((s) => s.ownerId === ownerId && s.fromWallet);
  const pending = sum(outs.filter((w) => w.status === 'pending' || w.status === 'processing'), (w) => w.amount);
  const balanceNow = round2(credits - sum(outs, (w) => w.amount) - sum(charges, (s) => s.amount));
  return { credits: round2(credits), fees: round2(sum(pays, (p) => p.fee)), withdrawn: round2(sum(outs.filter((w) => w.status === 'paid'), (w) => w.amount)), pending: round2(pending), balance: balanceNow };
}

export const payoutFee = (platform, kind) => (kind === 'bank' ? platform.payoutFees.bank : platform.payoutFees.momo);
