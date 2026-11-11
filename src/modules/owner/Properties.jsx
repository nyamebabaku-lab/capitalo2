import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MapPin, Building2 } from 'lucide-react';
import { useStore } from '../../data/store';
import { useMe, useData } from '../../lib/session';
import { PageHeader, Button, Card, Progress, EmptyState, Badge, FormModal, toast } from '../../components/ui';
import PropertyArt from '../../components/PropertyArt';
import { occupancy, arrearsTotal } from '../../lib/stats';
import { moneyShort, sum } from '../../lib/format';
import { readImage } from '../shared/BrandEditor';

export const PROPERTY_TYPES = ['Apartments', 'Compound house', 'Townhouses', 'Houses', 'Commercial', 'Hostel', 'Mixed use'];
export const propertyFields = [
  { name: 'name', label: 'Property name', required: true, placeholder: 'e.g. Adom Court' },
  { name: 'type', label: 'Type', type: 'select', options: PROPERTY_TYPES, required: true },
  { name: 'city', label: 'City / town', required: true, placeholder: 'e.g. Accra' },
  { name: 'area', label: 'Area', placeholder: 'e.g. Ayeduase' },
  { name: 'address', label: 'Street address', span: 2 },
  { name: 'gps', label: 'Ghana Post GPS', placeholder: 'GA-123-4567' },
  { name: 'amenitiesText', label: 'Amenities', placeholder: 'Comma separated: Borehole, Security, Parking' },
  { name: 'photo', label: 'Cover photo', type: 'custom', span: 2, render: ({ photo: v }, set) => (
    <div className="flex items-center gap-3">
      <div className="h-16 w-28 overflow-hidden rounded-xl bg-ivory-200">{v && <img src={v} alt="" className="h-full w-full object-cover" />}</div>
      <label className="cursor-pointer rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
        {v ? 'Change photo' : 'Upload photo'}
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => { try { set(await readImage(e.target.files[0], 900)); } catch (err) { toast.error(err.message); } }} />
      </label>
      {v && <button type="button" className="text-xs text-slate-500" onClick={() => set('')}>Remove</button>}
      {!v && <span className="text-xs text-slate-400">Optional — we draw one if you skip it</span>}
    </div>
  ) },
];

export default function Properties() {
  const { user, owner } = useMe();
  const d = useData();
  const add = useStore((s) => s.add);
  const plans = useStore((s) => s.platform.plans);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (params.get('new')) { setOpen(true); setParams({}, { replace: true }); } }, [params, setParams]);
  const plan = plans.find((p) => p.id === owner.plan);

  const save = (v) => {
    const p = add('properties', { ownerId: owner.id, ...v, amenities: (v.amenitiesText || '').split(',').map((x) => x.trim()).filter(Boolean), hue: d.properties.length });
    toast.success('Property added', 'Now add its units');
    setOpen(false);
    nav(`/properties/${p.id}?units=1`);
  };

  return (
    <div>
      <PageHeader title="Properties" subtitle={`${d.properties.length} properties · ${d.units.length} units${user.role === 'owner' ? ` · ${plan?.name} plan (${plan?.units > 9999 ? 'unlimited' : `up to ${plan?.units}`} units)` : ''}`}
        actions={user.role === 'owner' && <Button icon={Plus} onClick={() => setOpen(true)}>Add property</Button>} />
      {d.properties.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {d.properties.map((p) => {
            const units = d.units.filter((u) => u.propertyId === p.id);
            const o = occupancy(units);
            const rentRoll = sum(d.leases.filter((l) => l.status === 'active' && units.some((u) => u.id === l.unitId)), (l) => l.rent);
            const arr = arrearsTotal(d.invoices.filter((i) => i.propertyId === p.id));
            return (
              <Card key={p.id} className="group cursor-pointer overflow-hidden transition hover:-translate-y-1 hover:shadow-lift" onClick={() => nav(`/properties/${p.id}`)}>
                <div className="relative h-40 overflow-hidden">
                  <PropertyArt property={p} className="transition duration-500 group-hover:scale-105" />
                  <Badge tone="slate" className="absolute left-3 top-3 !bg-white/90 !text-slate-700 backdrop-blur">{p.type}</Badge>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{o.beds ? `${o.bedsTaken}/${o.beds} beds` : `${o.pct}% occupied`}</span>
                </div>
                <div className="p-5">
                  <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{p.area}, {p.city}</p>
                  <Progress value={o.pct} className="mt-4" tone={o.pct >= 90 ? 'green' : 'brand'} />
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-extrabold">{units.length}</p><p className="text-[10px] uppercase text-slate-400">Units</p></div>
                    <div><p className="text-sm font-extrabold">{moneyShort(rentRoll)}</p><p className="text-[10px] uppercase text-slate-400">Rent / mo</p></div>
                    <div><p className={`text-sm font-extrabold ${arr ? 'text-red-600' : ''}`}>{arr ? moneyShort(arr) : '—'}</p><p className="text-[10px] uppercase text-slate-400">Arrears</p></div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={Building2} title="Add your first property" text="A property is a building or compound. You’ll add its rooms, flats or shops as units next." action={user.role === 'owner' && <Button icon={Plus} onClick={() => setOpen(true)}>Add property</Button>} /></Card>
      )}
      <FormModal open={open} onClose={() => setOpen(false)} title="Add property" fields={propertyFields} initial={{ type: 'Apartments', city: 'Accra' }} onSubmit={save} submitLabel="Add property" />
    </div>
  );
}
