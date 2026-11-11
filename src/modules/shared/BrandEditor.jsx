// Owner branding: company name, logo, colours, font, corners, sidebar and light/dark — with a live preview.
import { useRef } from 'react';
import { Upload, Trash2, Check, AlertTriangle, LayoutDashboard, Building2, Receipt, Wallet, Moon, Sun } from 'lucide-react';
import { Field, Input, cx, Button, toast } from '../../components/ui';
import { PRESETS, FONTS, readable, scale, rgbToHex } from '../../lib/theme';
import { CompanyLogo } from '../../components/layout/Logo';

/** Reads an image file and shrinks it to fit in `max` px (keeps PNG transparency). */
export function readImage(file, max = 320, type = 'image/png') {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Please choose an image file (PNG, JPG or SVG).'));
    if (file.type === 'image/svg+xml') {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(file);
      return undefined;
    }
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.8) : c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = URL.createObjectURL(file);
    return undefined;
  });
}

export function LogoPicker({ value, onChange, owner }) {
  const ref = useRef();
  const pick = async (f) => {
    try { onChange(await readImage(f)); } catch (e) { toast.error('Logo not added', e.message); }
  };
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-ivory-300 p-6 text-center dark:border-white/10 sm:flex-row sm:text-left"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
    >
      <CompanyLogo owner={{ ...owner, logo: value }} size="xl" className="ring-1 ring-ivory-200 dark:ring-white/10" />
      <div className="flex-1">
        <p className="font-semibold text-slate-800 dark:text-white">{value ? 'Your logo' : 'Upload your company logo'}</p>
        <p className="mt-1 text-xs text-slate-500">PNG with a transparent background looks best. Square or wide, up to 5 MB. Drag & drop works too.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button size="sm" icon={Upload} onClick={() => ref.current.click()}>{value ? 'Change logo' : 'Choose image'}</Button>
          {value && <Button size="sm" variant="secondary" icon={Trash2} onClick={() => onChange('')}>Remove</Button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && pick(e.target.files[0])} />
      </div>
    </div>
  );
}

function Swatch({ hex, active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} title={label} className={cx('relative h-10 w-10 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-navy-900', active ? 'ring-slate-900 dark:ring-white' : 'ring-transparent hover:scale-110')} style={{ background: hex }}>
      {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />}
    </button>
  );
}

export function ColourPicker({ theme, onChange }) {
  const fix = readable(theme.brand);
  return (
    <div className="space-y-5">
      <div>
        <span className="label">Ready-made palettes</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => onChange({ brand: p.brand, accent: p.accent })} className={cx('flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition', theme.brand === p.brand && theme.accent === p.accent ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'border-ivory-200 hover:border-brand-300 dark:border-white/10')}>
              <span className="flex -space-x-1.5"><span className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: p.brand }} /><span className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: p.accent }} /></span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[['brand', 'Main colour', 'Buttons, menus, highlights'], ['accent', 'Accent colour', 'Badges, active menu, details']].map(([k, l, h]) => (
          <Field key={k} label={l} hint={h}>
            <div className="flex items-center gap-2">
              <label className="relative h-11 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-ivory-300 dark:ring-white/10" style={{ background: theme[k] }}>
                <input type="color" value={theme[k]} onChange={(e) => onChange({ [k]: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <Input value={theme[k]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && onChange({ [k]: e.target.value })} className="font-mono uppercase" />
            </div>
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(scale(fix.hex)).map(([k, rgb]) => <span key={k} title={k} className="h-6 w-6 rounded-md" style={{ background: rgbToHex(rgb) }} />)}
      </div>
      {fix.changed && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> That colour is quite light, so we darken it a little ({fix.hex}) to keep white text on buttons readable.
        </p>
      )}
    </div>
  );
}

export function StylePicker({ theme, onChange }) {
  const opt = (k, v, children, extra) => (
    <button type="button" onClick={() => onChange({ [k]: v })} className={cx('rounded-2xl border p-3 text-left transition', theme[k] === v ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/15 dark:bg-brand-500/10' : 'border-ivory-200 hover:border-brand-300 dark:border-white/10', extra)}>
      {children}
    </button>
  );
  return (
    <div className="space-y-5">
      <div>
        <span className="label">Heading font</span>
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map((f) => opt('font', f.value, <><p className="text-2xl" style={{ fontFamily: `'${f.value}'` }}>Aa</p><p className="mt-1 text-xs font-bold">{f.label}</p><p className="text-[11px] text-slate-500">{f.sample}</p></>))}
        </div>
      </div>
      <div>
        <span className="label">Corners</span>
        <div className="grid grid-cols-3 gap-2">
          {[['sharp', 'Sharp', 'rounded-md'], ['rounded', 'Rounded', 'rounded-xl'], ['soft', 'Soft', 'rounded-3xl']].map(([v, l, r]) => opt('radius', v, <><div className={cx('h-8 w-full bg-brand-600/80', r)} /><p className="mt-2 text-xs font-bold">{l}</p></>))}
        </div>
      </div>
      <div>
        <span className="label">Menu style</span>
        <div className="grid grid-cols-3 gap-2">
          {[['dark', 'Deep', 'bg-brand-950'], ['brand', 'Colourful', 'bg-gradient-to-b from-brand-600 to-brand-900'], ['light', 'Light', 'bg-white ring-1 ring-ivory-200']].map(([v, l, c]) => opt('sidebar', v, <><div className={cx('h-12 w-full rounded-lg p-1.5', c)}><div className="h-2 w-2/3 rounded bg-accent-400" /><div className={cx('mt-1 h-1.5 w-1/2 rounded', v === 'light' ? 'bg-slate-200' : 'bg-white/30')} /></div><p className="mt-2 text-xs font-bold">{l}</p></>))}
        </div>
      </div>
      <div>
        <span className="label">Appearance</span>
        <div className="grid grid-cols-2 gap-2">
          {opt('dark', false, <p className="flex items-center gap-2 text-sm font-bold"><Sun className="h-4 w-4" /> Light</p>)}
          {opt('dark', true, <p className="flex items-center gap-2 text-sm font-bold"><Moon className="h-4 w-4" /> Dark</p>)}
        </div>
      </div>
    </div>
  );
}

/** Miniature of the owner's app with their branding (uses the live CSS variables). */
export function BrandPreview({ owner }) {
  const t = owner.theme;
  const side = t.sidebar === 'light' ? 'bg-white border-r border-ivory-200 text-slate-600' : t.sidebar === 'brand' ? 'bg-gradient-to-b from-brand-600 to-brand-900 text-white/80' : 'bg-brand-950 text-white/80';
  return (
    <div className={cx('overflow-hidden rounded-2xl shadow-lift ring-1 ring-black/5', t.dark ? 'dark bg-navy-950' : 'bg-ivory-100')}>
      <div className="flex h-[300px]">
        <div className={cx('flex w-[38%] flex-col gap-1 p-3', side)}>
          <div className="mb-2 flex items-center gap-2">
            <CompanyLogo owner={owner} size="sm" />
            <p className={cx('truncate font-display text-[11px] font-semibold', t.sidebar === 'light' ? 'text-slate-900' : 'text-white')}>{owner.company || 'Your company'}</p>
          </div>
          {[[LayoutDashboard, 'Dashboard', true], [Building2, 'Properties'], [Receipt, 'Rent & Bills'], [Wallet, 'Wallet']].map(([I, l, a]) => (
            <div key={l} className={cx('flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold', a && (t.sidebar === 'light' ? 'bg-brand-600 text-white' : 'bg-accent-400 text-brand-950'))}><I className="h-3 w-3" />{l}</div>
          ))}
        </div>
        <div className="flex-1 space-y-2 p-3">
          <p className={cx('font-display text-sm font-semibold', t.dark ? 'text-white' : 'text-slate-900')}>Good morning 👋</p>
          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-3 text-white" style={{ borderRadius: 'var(--radius)' }}>
            <p className="text-[9px] text-white/70">Wallet balance</p>
            <p className="text-lg font-extrabold">GH₵ 12,450.00</p>
            <span className="mt-1 inline-block rounded-full bg-accent-400 px-2 py-0.5 text-[9px] font-bold text-brand-950">Withdraw</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['Occupied 92%', 'Arrears GH₵ 2.1k'].map((x) => <div key={x} className={cx('p-2 text-[9px] font-bold', t.dark ? 'bg-navy-900 text-slate-200' : 'bg-white text-slate-700')} style={{ borderRadius: 'var(--radius)' }}>{x}</div>)}
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-lg bg-brand-600 px-2 py-1 text-[9px] font-semibold text-white">Record payment</span>
            <span className="rounded-full bg-accent-100 px-2 py-1 text-[9px] font-semibold text-accent-800">Paid</span>
          </div>
        </div>
      </div>
    </div>
  );
}
