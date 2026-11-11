import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { X, Search, ChevronLeft, ChevronRight, ArrowUpDown, CheckCircle2, AlertTriangle, Info, Inbox } from 'lucide-react';
import { initials } from '../../lib/format';

export const cx = (...c) => c.filter(Boolean).join(' ');

// ---------------- Tones ----------------
const TONES = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/15 dark:bg-brand-500/15 dark:text-brand-300',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15 dark:bg-brand-500/15 dark:text-brand-300',
  red: 'bg-accent-50 text-accent-700 ring-accent-600/15 dark:bg-accent-500/15 dark:text-accent-300',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/15 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/10 dark:text-slate-300',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-300',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/15 dark:text-teal-300',
  gold: 'bg-gold-50 text-gold-800 ring-gold-600/25 dark:bg-gold-500/15 dark:text-gold-300',
  terracotta: 'bg-accent-50 text-accent-700 ring-accent-600/15 dark:bg-accent-500/15 dark:text-accent-300',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-300',
};
const ICON_TONES = {
  blue: 'bg-brand-600 text-white shadow-brand-600/30',
  red: 'bg-accent-600 text-white shadow-accent-600/30',
  green: 'bg-emerald-500 text-white shadow-emerald-500/30',
  amber: 'bg-amber-500 text-white shadow-amber-500/30',
  violet: 'bg-violet-500 text-white shadow-violet-500/30',
  navy: 'bg-navy-800 text-white shadow-navy-800/30',
  gold: 'bg-gold-500 text-brand-950 shadow-gold-500/30',
  brand: 'bg-brand-700 text-white shadow-brand-700/30',
  orange: 'bg-orange-500 text-white shadow-orange-500/30',
  rose: 'bg-rose-500 text-white shadow-rose-500/30',
  teal: 'bg-teal-500 text-white shadow-teal-500/30',
  sky: 'bg-sky-500 text-white shadow-sky-500/30',
};

// ---------------- Primitives ----------------
const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30',
  danger: 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm shadow-accent-600/30',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300',
  'soft-red': 'bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-500/15 dark:text-accent-300',
};
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-sm gap-2' };

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
        BTN[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, tone = 'ghost', ...props }) {
  return (
    <button type="button" title={label} aria-label={label} className={cx('inline-flex h-9 w-9 items-center justify-center rounded-xl transition', BTN[tone], className)} {...props}>
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export const Card = ({ className, children, ...p }) => (
  <div className={cx('card', className)} {...p}>
    {children}
  </div>
);

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export const Badge = ({ tone = 'slate', className, children, dot }) => (
  <span className={cx('chip ring-1 ring-inset', TONES[tone] || TONES.slate, className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

const AV_COLORS = ['bg-brand-600', 'bg-accent-600', 'bg-gold-600', 'bg-teal-700', 'bg-amber-700', 'bg-brand-800', 'bg-orange-700', 'bg-emerald-700'];
/** Initials avatar; pass `src` (an image URL or data URL) to show a picture instead. */
export function Avatar({ name = '', size = 'md', className, src: img }) {
  const n = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const sz = { xs: 'h-7 w-7 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' }[size];
  if (img) return <img src={img} alt={name} className={cx('shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-navy-900', sz, className)} />;
  return (
    <div className={cx('flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white dark:ring-navy-900', AV_COLORS[n % AV_COLORS.length], sz, className)}>
      {initials(name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Dr\. Mrs\.)\s/, ''))}
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const Input = ({ className, ...p }) => <input className={cx('input', className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx('input min-h-[96px]', className)} {...p} />;
export function Select({ options = [], placeholder, className, ...p }) {
  return (
    <select className={cx('input appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2394a3b8%22%3E%3Cpath%20d%3D%22M5.3%207.3a1%201%200%20011.4%200L10%2010.6l3.3-3.3a1%201%200%20111.4%201.4l-4%204a1%201%200%2001-1.4%200l-4-4a1%201%200%20010-1.4z%22/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9', className)} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Progress({ value, tone = 'blue', className }) {
  const c = { blue: 'bg-brand-600', brand: 'bg-brand-600', red: 'bg-accent-600', green: 'bg-emerald-500', amber: 'bg-amber-500', gold: 'bg-gold-500', sky: 'bg-sky-500' }[tone] || 'bg-brand-600';
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10', className)}>
      <div className={cx('h-full rounded-full transition-all', c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('no-print -mx-1 flex gap-1 overflow-x-auto px-1 pb-1', className)}>
      <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
        {tabs.map((t) => {
          const k = typeof t === 'object' ? t.value : t;
          const l = typeof t === 'object' ? t.label : t;
          const Icon = typeof t === 'object' ? t.icon : null;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={cx(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                value === k ? 'bg-white text-brand-700 shadow-sm dark:bg-navy-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {l}
              {typeof t === 'object' && t.count != null && (
                <span className={cx('rounded-full px-1.5 text-[10px]', value === k ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200' : 'bg-slate-200 dark:bg-white/10')}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'blue', sub, trend, onClick }) {
  return (
    <Card className={cx('relative overflow-hidden p-4 sm:p-5', onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lift')} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl">{value}</p>
          {(sub || trend) && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              {trend && <span className={cx('font-semibold', trend.startsWith('-') ? 'text-accent-600' : 'text-emerald-600')}>{trend}</span>}
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg sm:h-11 sm:w-11 sm:rounded-2xl', ICON_TONES[tone])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-bold text-slate-800 dark:text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-900 dark:text-white sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------- Modal ----------------
// Open modals, newest last: only the top one reacts to Escape, and the page stays locked until all close.
const modalStack = [];

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const token = useRef({});
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const me = token.current;
    modalStack.push(me);
    const h = (e) => e.key === 'Escape' && modalStack[modalStack.length - 1] === me && closeRef.current?.();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      modalStack.splice(modalStack.indexOf(me), 1);
      if (!modalStack.length) document.body.style.overflow = '';
    };
  }, [open]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size];
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full animate-scale-in flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-navy-900 sm:rounded-3xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4 safe-bottom dark:border-white/5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------- Toasts & confirm ----------------
const useToastStore = create((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200);
  },
  confirmState: null,
  setConfirm: (confirmState) => set({ confirmState }),
}));

export const toast = {
  success: (title, text) => useToastStore.getState().push({ type: 'success', title, text }),
  error: (title, text) => useToastStore.getState().push({ type: 'error', title, text }),
  info: (title, text) => useToastStore.getState().push({ type: 'info', title, text }),
};

export const confirmDialog = (title, text, { danger = true, confirmLabel = 'Confirm' } = {}) =>
  new Promise((resolve) => useToastStore.getState().setConfirm({ title, text, danger, confirmLabel, resolve }));

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const c = useToastStore((s) => s.confirmState);
  const setConfirm = useToastStore((s) => s.setConfirm);
  const close = (v) => {
    c?.resolve(v);
    setConfirm(null);
  };
  const ICONS = { success: [CheckCircle2, 'text-emerald-500'], error: [AlertTriangle, 'text-accent-600'], info: [Info, 'text-brand-600'] };
  return (
    <>
      <div className="no-print pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end">
        {toasts.map((t) => {
          const [Icon, color] = ICONS[t.type];
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-lift dark:border-white/10 dark:bg-navy-800">
              <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', color)} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
                {t.text && <p className="text-xs text-slate-500">{t.text}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <Modal
        open={!!c}
        onClose={() => close(false)}
        title={c?.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={c?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {c?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{c?.text}</p>
      </Modal>
    </>
  );
}

// ---------------- DataTable ----------------
/**
 * columns: [{ key, label, render?(row), sort?(row) => value, className?, hideOnMobile? }]
 */
export function DataTable({ columns, rows, search = true, searchText, pageSize = 12, onRowClick, toolbar, empty, initialSort, dense, footer }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(initialSort || null);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((row) => (searchText ? searchText(row) : Object.values(row).join(' ')).toLowerCase().includes(needle));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const val = col?.sort || ((row) => row[sort.key]);
      r = [...r].sort((a, b) => {
        const x = val(a);
        const y = val(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, q, sort, columns, searchText]);

  useEffect(() => setPage(0), [q, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Card className="overflow-hidden">
      {(search || toolbar) && (
        <div className="no-print flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/5 md:flex-row md:items-center">
          {search && <SearchInput value={q} onChange={setQ} className="md:w-72" />}
          {toolbar && <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">{toolbar}</div>}
        </div>
      )}
      {filtered.length === 0 ? (
        empty || <EmptyState title="No records found" text={q ? 'Try a different search term.' : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-white/[.03]">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={cx('th', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                    {c.nosort ? (
                      c.label
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 uppercase hover:text-slate-800 dark:hover:text-white"
                        onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'asc' ? 'desc' : 'asc' }))}
                      >
                        {c.label}
                        <ArrowUpDown className={cx('h-3 w-3', sort?.key === c.key ? 'text-brand-600' : 'opacity-40')} />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {view.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx('transition', onRowClick && 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-white/[.03]')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cx('td', dense && 'py-2', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer}
          </table>
        </div>
      )}
      {filtered.length > pageSize && (
        <div className="no-print flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-white/5">
          <span>
            {page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Previous" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30" />
            <span className="px-2 font-semibold">
              {page + 1} / {pages}
            </span>
            <IconButton icon={ChevronRight} label="Next" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------- Generic form ----------------
/**
 * fields: [{ name, label, type: text|number|date|select|textarea|email|tel|time, options, required, span: 2, placeholder }]
 */
export function FormFields({ fields, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        if (f.hidden?.(value)) return null;
        if (f.type === 'custom')
          return (
            <div key={f.name} className={f.span === 2 ? 'sm:col-span-2' : ''}>
              {f.label && <span className="label">{f.label}</span>}
              {f.render(value, (v) => set(f.name, v))}
            </div>
          );
        const common = {
          value: value[f.name] ?? '',
          required: f.required,
          placeholder: f.placeholder,
          onChange: (e) => set(f.name, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value),
        };
        return (
          <Field key={f.name} label={f.label + (f.required ? ' *' : '')} hint={f.hint} className={f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {f.type === 'select' ? (
              <Select options={typeof f.options === 'function' ? f.options(value) : f.options} placeholder={f.placeholder ?? 'Select…'} {...common} />
            ) : f.type === 'textarea' ? (
              <Textarea {...common} />
            ) : f.type === 'checkbox' ? (
              <input type="checkbox" className="h-5 w-5 rounded accent-brand-600" checked={!!value[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
            ) : (
              <Input type={f.type || 'text'} step={f.step} min={f.min} max={f.max} {...common} />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export function FormModal({ open, onClose, title, subtitle, fields, initial, onSubmit, submitLabel = 'Save', size = 'lg' }) {
  const [value, setValue] = useState(initial || {});
  useEffect(() => {
    if (open) setValue(initial || {});
  }, [open, initial]);
  const submit = (e) => {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && !f.hidden?.(value) && (value[f.name] === undefined || value[f.name] === ''));
    if (missing.length) {
      toast.error('Missing information', `Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    onSubmit(value);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="form-modal">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="form-modal" onSubmit={submit}>
        <FormFields fields={fields} value={value} onChange={setValue} />
      </form>
    </Modal>
  );
}

export function KeyValue({ items, cols = 2 }) {
  return (
    <dl className={cx('grid gap-x-6 gap-y-4', cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} />;

/** Compact pill switcher (e.g. Day / Week / Month). */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-cream-200/70 p-0.5 dark:bg-white/5', className)}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return (
          <button key={v} type="button" onClick={() => onChange(v)} className={cx('rounded-[10px] px-3 py-1.5 text-xs font-semibold transition', value === v ? 'bg-white text-brand-800 shadow-sm dark:bg-navy-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** Big +/- number stepper that is easy to use with a thumb on a phone. */
export function Stepper({ value, onChange, step = 1, min = 0, className }) {
  const v = Number(value) || 0;
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <button type="button" onClick={() => onChange(Math.max(min, v - step))} className="h-11 w-11 shrink-0 rounded-xl bg-cream-200 text-lg font-bold text-brand-800 active:scale-95 dark:bg-white/10 dark:text-white">−</button>
      <input inputMode="decimal" className="input h-11 text-center text-base font-bold" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      <button type="button" onClick={() => onChange(v + step)} className="h-11 w-11 shrink-0 rounded-xl bg-brand-700 text-lg font-bold text-white active:scale-95">+</button>
    </div>
  );
}

/** Turns one element (receipt, agreement, report) into a PDF: share sheet on phones / in the apps, download on computers. */
export async function printElement(id, title = 'Capital O2 Estates & Hostel') {
  const el = document.getElementById(id);
  if (!el) return;
  toast.info('Preparing PDF…');
  try {
    const { elementToPdf, sharePdf } = await import('../../lib/pdf');
    const r = await sharePdf(await elementToPdf(el), title);
    if (r === 'downloaded') toast.success('PDF downloaded', `${title}.pdf`);
  } catch (e) {
    toast.error('Could not make the PDF', e?.message || 'Please try again');
  }
}
