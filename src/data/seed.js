// Demo data: three owners, 5 properties in Accra/Tema/Kumasi, ~40 units, tenants, leases, invoices,
// payments (mostly MoMo), payouts, maintenance and expenses — all relative to today.
import { addDays, addMonths, format, parseISO } from 'date-fns';
import { leaseInvoices, allocate, ONLINE, balance } from '../lib/billing';
import { DEFAULT_THEME } from '../lib/theme';
import { round2 } from '../lib/format';

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PLANS = [
  { id: 'capitalo2', name: 'Capital O2', price: 0, units: 100000, perks: [] },
  { id: 'starter', name: 'Starter', price: 0, units: 5, perks: ['Up to 5 units', 'Online rent collection', 'Receipts & reminders'] },
  { id: 'growth', name: 'Growth', price: 150, units: 40, perks: ['Up to 40 units', 'Staff accounts', 'Reports & exports', 'SMS reminders'] },
  { id: 'enterprise', name: 'Enterprise', price: 450, units: 100000, perks: ['Unlimited units', 'Priority payouts', 'Dedicated support', 'Custom SMS sender'] },
];

export const PLATFORM = {
  name: 'Capital O2 Estates & Hostel',
  single: true,
  feePct: 0,
  payoutFees: { momo: 1, bank: 5 },
  minWithdraw: 10,
  autoLimit: 5000,
  graceDays: 5,
  testMode: true,
  plans: PLANS,
};

export const SMS_TEMPLATES = {
  reminder: 'Hello {name}, your rent of {amount} for {unit} is due on {due}. Pay easily with MoMo in the Capital O2 Hostel app. Thank you.',
  overdue: 'Dear {name}, your rent balance of {amount} for {unit} is overdue. Kindly pay today to avoid a late fee. – {company}',
  receipt: 'Payment received: {amount} for {unit}. Receipt {ref}. Thank you, {name}! – {company}',
  expiry: 'Hello {name}, your tenancy for {unit} ends on {due}. Reply or call us to renew. – {company}',
};

const FIRST = ['Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Abena', 'Kwabena', 'Adwoa', 'Kojo', 'Efua', 'Kwaku', 'Akua', 'Kwesi', 'Esi', 'Nana', 'Afia', 'Selorm', 'Elikem', 'Dzifa', 'Mawuli', 'Naa', 'Nii', 'Fatima', 'Ibrahim', 'Abdul', 'Mariam', 'Delali', 'Seyram', 'Edem', 'Yaa', 'Fiifi', 'Ekow', 'Araba', 'Baaba', 'Komla', 'Sena'];
const LAST = ['Mensah', 'Asante', 'Owusu', 'Boateng', 'Appiah', 'Osei', 'Agyeman', 'Darko', 'Addo', 'Quaye', 'Tetteh', 'Ansah', 'Amoah', 'Badu', 'Frimpong', 'Acheampong', 'Sarpong', 'Danso', 'Asamoah', 'Ofori', 'Adjei', 'Nkrumah', 'Lamptey', 'Kumi', 'Yeboah', 'Gyamfi', 'Amponsah', 'Arthur', 'Annan', 'Kuffour', 'Mahama', 'Issah', 'Abubakar', 'Agbeko', 'Dogbe'];
const JOBS = ['Teacher', 'Nurse', 'Banker', 'Software developer', 'Trader', 'Civil servant', 'Accountant', 'Pharmacist', 'Engineer', 'Student', 'Fashion designer', 'Driver', 'Doctor', 'Marketer', 'Lecturer', 'Lawyer', 'Caterer', 'Mechanic'];

export function buildSeed() {
  const r = rng(20261110);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const now = new Date();
  const day = (n) => format(addDays(now, n), 'yyyy-MM-dd');
  const phone = () => `0${pick(['24', '54', '55', '59', '20', '50', '27', '57', '26'])}${String(Math.floor(r() * 9000000) + 1000000)}`;
  const ghanaCard = () => `GHA-${String(Math.floor(r() * 900000000) + 100000000)}-${Math.floor(r() * 9)}`;

  const owners = [
    {
      id: 'o1', company: 'Capital O2 Estates & Hostel', tagline: 'Estates & Hostel · Comfortable living', contactName: 'Capital O2 Estates & Hostel', phone: '', email: '', address: 'Ghana',
      status: 'approved', plan: 'capitalo2', setupDone: true, code: 'CAPO2', provider: 'paystack', createdAt: day(-720),
      logo: 'capitalo2-badge.png', logoWide: 'capitalo2-logo.png', frontImage: '', theme: { ...DEFAULT_THEME },
      kyc: {}, payoutAccounts: [],
      settings: { graceDays: 5, lateFeePct: 5, autoReminders: true, reminderDays: 3, smsSender: 'CAPITAL O2', templates: SMS_TEMPLATES },
    },
  ];

  const properties = [
    { id: 'p1', ownerId: 'o1', name: 'Capital O2 Hostel', type: 'Hostel', city: 'Ghana', area: 'Main block', address: 'Main block', gps: '', amenities: ['Wi-Fi', 'Study room', '24h security', 'Water', 'Backup generator'], photo: 'photos/hostel.jpg', hue: 0, createdAt: day(-700) },
    { id: 'p2', ownerId: 'o1', name: 'Capital O2 Hostel Annex', type: 'Hostel', city: 'Ghana', area: 'Annex', address: 'Annex block', gps: '', amenities: ['Wi-Fi', 'Kitchenette', 'Security'], photo: 'photos/mixed.jpg', hue: 1, createdAt: day(-500) },
    { id: 'p3', ownerId: 'o1', name: 'Capital O2 Estates — Apartments', type: 'Apartments', city: 'Ghana', area: 'Estates', address: 'Capital O2 Estates', gps: '', amenities: ['Parking', 'Borehole', 'Security', 'CCTV'], photo: 'photos/apartments.jpg', hue: 2, createdAt: day(-650) },
    { id: 'p4', ownerId: 'o1', name: 'Capital O2 Estates — Townhouses', type: 'Townhouses', city: 'Ghana', area: 'Estates', address: 'Capital O2 Estates', gps: '', amenities: ['Garden', 'Car port', 'Walled & gated'], photo: 'photos/houses.jpg', hue: 3, createdAt: day(-420) },
  ];

  const units = [];
  const addUnits = (propertyId, ownerId, list) => list.forEach(([label, kind, rent, beds, perBed]) => units.push({ id: `u${units.length + 1}`, propertyId, ownerId, label, kind, rent, beds, perBed: !!perBed, taken: 0, status: 'vacant' }));
  // Hostel rent is per month (per bed in shared rooms); students are billed per semester (4 months) or per academic year.
  addUnits('p1', 'o1', [['A101', 'Hostel room (1 in 1)', 900, 1], ['A102', 'Hostel room (1 in 1)', 900, 1], ['A103', 'Hostel room (2 in 1)', 650, 2, true], ['A104', 'Hostel room (2 in 1)', 650, 2, true], ['A105', 'Hostel room (2 in 1)', 650, 2, true], ['A106', 'Hostel room (2 in 1)', 650, 2, true], ['B201', 'Hostel room (4 in 1)', 450, 4, true], ['B202', 'Hostel room (4 in 1)', 450, 4, true], ['B203', 'Hostel room (4 in 1)', 450, 4, true], ['B204', 'Hostel room (4 in 1)', 450, 4, true]]);
  addUnits('p2', 'o1', [['C1', 'Hostel room (2 in 1)', 600, 2, true], ['C2', 'Hostel room (2 in 1)', 600, 2, true], ['C3', 'Hostel room (2 in 1)', 600, 2, true], ['C4', 'Hostel room (2 in 1)', 600, 2, true], ['C5', 'Hostel room (1 in 1)', 850, 1], ['C6', 'Hostel room (1 in 1)', 850, 1]]);
  addUnits('p3', 'o1', [['A1', '2-bedroom apartment', 3500, 2], ['A2', '2-bedroom apartment', 3500, 2], ['A3', '2-bedroom apartment', 3500, 2], ['A4', '2-bedroom apartment', 3500, 2], ['B1', '1-bedroom apartment', 2200, 1], ['B2', '1-bedroom apartment', 2200, 1]]);
  addUnits('p4', 'o1', [['TH1', '3-bedroom townhouse', 5000, 3], ['TH2', '3-bedroom townhouse', 5000, 3], ['TH3', '3-bedroom townhouse', 5000, 3]]);

  // Vacant on purpose (so vacancies show); C6 is under repair.
  const vacant = new Set(['A106', 'C6', 'TH3']);
  units.find((u) => u.label === 'C6').status = 'repair';

  const tenants = [];
  const leases = [];
  const usedNames = new Set();
  const person = () => {
    let n;
    do n = `${pick(FIRST)} ${pick(LAST)}`; while (usedNames.has(n));
    usedNames.add(n);
    return n;
  };
  const cycleFor = (p) => (p.type === 'Commercial' ? pick(['quarterly', 'yearly', 'biannual']) : p.type === 'Hostel' ? pick(['semester', 'semester', 'academic']) : p.type === 'Apartments' ? pick(['monthly', 'monthly', 'quarterly', 'yearly']) : pick(['yearly', 'yearly', 'term', 'biannual', 'monthly']));

  const academicStart = format(new Date(now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, 7, 1), 'yyyy-MM-dd'); // 1 Aug
  const slots = [];
  units.forEach((u) => {
    if (vacant.has(u.label) || u.status === 'repair') return;
    // Shared rooms: one tenancy per bed (some beds left free so "x of y beds" shows).
    const n = u.perBed ? Math.max(1, u.beds - (r() < 0.35 ? 1 : 0)) : 1;
    for (let b = 1; b <= n; b++) slots.push([u, u.perBed ? b : undefined]);
  });
  slots.forEach(([u, bed]) => {
    const p = properties.find((x) => x.id === u.propertyId);
    const isDemoTenant = u.label === 'A2';
    const name = isDemoTenant ? 'Efua Asante' : person();
    const t = {
      id: `t${tenants.length + 1}`, ownerId: u.ownerId, name, phone: isDemoTenant ? '0245556677' : phone(), email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`,
      ghanaCard: ghanaCard(), occupation: p.type === 'Hostel' ? 'Student' : p.type === 'Commercial' ? pick(['Trader', 'Fashion designer', 'Pharmacist', 'Accountant']) : pick(JOBS),
      emergency: `${pick(FIRST)} ${pick(LAST)} · ${phone()}`, household: p.type === 'Commercial' ? 0 : 1 + Math.floor(r() * 4), createdAt: '',
    };
    const months = p.type === 'Hostel' ? 8 : pick([12, 12, 24, 24, 12, 36]);
    const cycle = isDemoTenant ? 'monthly' : cycleFor(p);
    // Start somewhere in the past so the lease is still running (a few end soon).
    const back = isDemoTenant ? 7 : Math.floor(r() * (months - 1)) + 1;
    const start = p.type === 'Hostel' ? academicStart : format(addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -back), 'yyyy-MM-dd');
    t.createdAt = start;
    tenants.push(t);
    leases.push({
      id: `l${leases.length + 1}`, ownerId: u.ownerId, unitId: u.id, propertyId: u.propertyId, tenantId: t.id, bed, start, months, cycle: cycle === 'term' && months > 24 ? 'yearly' : cycle, rent: u.rent,
      deposit: p.type === 'Hostel' ? 0 : u.rent * (p.type === 'Commercial' ? 2 : 1), status: 'active', no: `TA-${format(parseISO(start), 'yy')}-${String(leases.length + 1).padStart(4, '0')}`,
      signedOwner: { name: 'Capital O2 Estates & Hostel', at: start }, signedTenant: { name, at: start }, createdAt: start,
    });
    if (u.perBed) { u.taken = (u.taken || 0) + 1; u.status = u.taken >= u.beds ? 'occupied' : 'vacant'; } else u.status = 'occupied';
  });

  // A couple of past (ended) tenancies for history.
  ['TH3'].forEach((label) => {
    const u = units.find((x) => x.label === label);
    const name = person();
    const t = { id: `t${tenants.length + 1}`, ownerId: u.ownerId, name, phone: phone(), email: '', ghanaCard: ghanaCard(), occupation: pick(JOBS), emergency: '', household: 2, createdAt: day(-500), former: true };
    tenants.push(t);
    const start = format(addMonths(now, -18), 'yyyy-MM-01');
    leases.push({ id: `l${leases.length + 1}`, ownerId: u.ownerId, unitId: u.id, tenantId: t.id, start, months: 12, cycle: 'yearly', rent: u.rent, deposit: u.rent, status: 'ended', endedOn: format(addMonths(parseISO(start), 12), 'yyyy-MM-dd'), no: `TA-${String(leases.length + 1).padStart(4, '0')}`, signedOwner: { name: 'Capital O2 Estates & Hostel', at: start }, signedTenant: { name, at: start }, createdAt: start, refund: 'Deposit refunded' });
  });

  // Invoices from every lease, then pay most of them.
  const invoices = [];
  leases.forEach((l) => invoices.push(...leaseInvoices(l, units.find((u) => u.id === l.unitId), l.status === 'ended' ? parseISO(l.endedOn) : now)));

  // A few utility bills (prepaid water/sanitation/service charge).
  leases.filter((l) => l.status === 'active' && ['p3', 'p4'].includes(units.find((u) => u.id === l.unitId).propertyId)).slice(0, 6).forEach((l, i) => {
    const u = units.find((x) => x.id === l.unitId);
    invoices.push({ id: `inv_util_${i}`, ownerId: l.ownerId, leaseId: l.id, tenantId: l.tenantId, unitId: l.unitId, propertyId: u.propertyId, kind: 'utility', title: u.propertyId === 'p3' ? `Service charge ${format(addMonths(now, -1), 'MMM yyyy')}` : `Water bill ${format(addMonths(now, -1), 'MMM yyyy')}`, amount: u.propertyId === 'p3' ? 250 : 60 + Math.round(r() * 60), due: day(-8 + i), issued: day(-20), paid: 0 });
  });

  const payments = [];
  const fee = (amt, online) => (online ? round2((amt * PLATFORM.feePct) / 100) : 0);
  const refNo = () => `EW${String(Math.floor(r() * 1e9)).padStart(9, '0')}`;
  const sorted = [...invoices].sort((a, b) => a.due.localeCompare(b.due));
  sorted.forEach((inv) => {
    const dueDays = (parseISO(inv.due) - now) / 86400000;
    const tenant = tenants.find((t) => t.id === inv.tenantId);
    if (tenant.name === 'Efua Asante' && dueDays > -20) return; // demo tenant has rent to pay
    if (dueDays > 10) return; // too far ahead
    const roll = r();
    let amount = inv.amount;
    if (dueDays > -45 && roll < 0.12 && inv.amount <= 6000) return; // recent and unpaid → arrears
    if (dueDays > -45 && roll < 0.12) amount = round2(Math.round((inv.amount * 0.75) / 100) * 100); // big bills: mostly paid
    if (dueDays > -60 && roll < 0.3) amount = round2(Math.round((inv.amount * (0.3 + r() * 0.4)) / 10) * 10); // part payment
    const method = pick(['mtn', 'mtn', 'mtn', 'mtn', 'telecel', 'telecel', 'at', 'card', 'cash', 'bank']);
    const online = ONLINE.includes(method);
    const paidOn = format(addDays(parseISO(inv.due), Math.floor(r() * 9) - 6), 'yyyy-MM-dd');
    const at = `${paidOn > day(0) ? day(0) : paidOn}T${String(7 + Math.floor(r() * 13)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00`;
    const { allocations } = allocate(amount, [inv]);
    allocations.forEach((a) => (invoices.find((x) => x.id === a.invoiceId).paid += a.amount));
    const f = fee(amount, online);
    payments.push({ id: `pay${payments.length + 1}`, ownerId: inv.ownerId, tenantId: inv.tenantId, unitId: inv.unitId, propertyId: inv.propertyId, amount, fee: f, net: round2(amount - f), method, online, ref: refNo(), at, allocations, by: online ? 'tenant' : 'Capital O2 Accounts', payer: method === 'card' ? '•••• 4421' : online ? tenant.phone : '' });
  });

  // Capital O2 collects straight into its own Paystack/Hubtel account: no wallet, payouts or plan charges.
  const withdrawals = [];
  const subscriptions = [];

  const users = [
    { id: 'u_owner', role: 'owner', ownerId: 'o1', name: 'Abena Mensah', phone: '0544212969', email: 'info@capitalo2.com', title: 'Owner / MD' },
    { id: 'u_mgr', role: 'manager', ownerId: 'o1', name: 'Kofi Boateng', phone: '0551239876', email: '', title: 'Hostel Manager', propertyIds: ['p1', 'p2'], perms: { payments: true, tenants: true, maintenance: true, expenses: true, reports: false } },
    { id: 'u_care', role: 'manager', ownerId: 'o1', name: 'Yaw Darko', phone: '0247778899', email: '', title: 'Caretaker', propertyIds: ['p3', 'p4'], perms: { payments: true, tenants: false, maintenance: true, expenses: false, reports: false } },
    { id: 'u_tenant', role: 'tenant', ownerId: 'o1', tenantId: tenants.find((t) => t.name === 'Efua Asante').id, name: 'Efua Asante', phone: '0245556677', email: 'efua.asante@gmail.com' },
  ];

  const MT = [
    ['Leaking kitchen tap', 'Plumbing', 'medium'], ['No light in bedroom', 'Electrical', 'high'], ['Broken louvre blades', 'Carpentry', 'low'], ['AC not cooling', 'Electrical', 'medium'],
    ['Toilet cistern not filling', 'Plumbing', 'high'], ['Door lock jammed', 'Security', 'high'], ['Ceiling stain after rain', 'Roofing', 'medium'], ['Gate remote not working', 'Security', 'low'],
    ['Water pump making noise', 'Plumbing', 'medium'], ['Repaint shop front', 'Painting', 'low'], ['Prepaid meter showing error', 'Electrical', 'high'],
  ];
  const active = leases.filter((l) => l.status === 'active');
  const maintenance = MT.map(([title, category, priority], i) => {
    const l = i === 0 ? active.find((x) => tenants.find((t) => t.id === x.tenantId).name === 'Efua Asante') : active[(i * 7) % active.length];
    const u = units.find((x) => x.id === l.unitId);
    const status = i === 0 ? 'in progress' : ['open', 'assigned', 'in progress', 'done', 'done', 'done'][i % 6];
    return { id: `m${i + 1}`, ownerId: l.ownerId, unitId: u.id, propertyId: u.propertyId, tenantId: l.tenantId, title, category, priority, status, desc: `${title}. Please send someone to check.`, assignee: status === 'open' ? '' : pick(['Kofi Boateng', 'Yaw Darko', 'Mensah Plumbing Works', 'Sparkle Electricals']), cost: status === 'done' ? 80 + Math.round(r() * 600) : 0, at: `${day(-Math.floor(r() * 40) - (status === 'done' ? 10 : 0))}T09:30:00`, updates: [] };
  });

  const EXP = [['Repairs & maintenance', 300, 2500], ['Security services', 1200, 1800], ['Cleaning & waste', 200, 600], ['ECG / utilities', 400, 1500], ['Property rates (Assembly)', 800, 3000], ['Insurance', 1500, 2500], ['Agent commission', 500, 2000]];
  const expenses = [];
  for (let m = 0; m < 6; m++)
    ['p1', 'p2', 'p3', 'p4'].forEach((pid) => {
      if (r() < 0.45) return;
      const [category, lo, hi] = pick(EXP);
      expenses.push({ id: `e${expenses.length + 1}`, ownerId: 'o1', propertyId: pid, category, amount: Math.round(lo + r() * (hi - lo)), date: format(addDays(addMonths(now, -m), -Math.floor(r() * 25)), 'yyyy-MM-dd'), note: '', by: 'Capital O2 Accounts' });
    });

  const notices = [
    { id: 'n1', ownerId: 'o1', propertyId: 'p1', title: 'Water tank cleaning on Saturday', body: 'There will be no running water from 8am to 1pm this Saturday while the overhead tanks are cleaned. Please store some water. Thank you.', at: `${day(-2)}T08:00:00` },
    { id: 'n2', ownerId: 'o1', propertyId: '', title: 'Pay rent with MoMo in the app', body: 'You can now pay rent, service charge and bills directly in the app with MTN MoMo, Telecel Cash, AT Money or card. Your receipt arrives instantly.', at: `${day(-20)}T10:00:00` },
    { id: 'n3', ownerId: 'o1', propertyId: 'p2', title: 'New security guard', body: 'Please welcome Mr. Issah, our new night porter at the Hostel Annex.', at: `${day(-35)}T17:00:00` },
  ];

  const sms = [];
  invoices.filter((i) => i.ownerId === 'o1' && balance(i) > 0 && i.due < day(0)).slice(0, 6).forEach((inv, i) => {
    const t = tenants.find((x) => x.id === inv.tenantId);
    sms.push({ id: `sms${i + 1}`, ownerId: 'o1', to: t.phone, name: t.name, kind: 'overdue', text: `Dear ${t.name}, your rent balance for ${units.find((u) => u.id === inv.unitId).label} is overdue. Kindly pay today to avoid a late fee. – Capital O2 Estates & Hostel`, at: `${day(-1)}T09:00:00`, status: 'delivered' });
  });

  const alerts = [];
  return { platform: PLATFORM, owners, users, properties, units, tenants, leases, invoices, payments, withdrawals, subscriptions, maintenance, expenses, notices, sms, alerts };
}
