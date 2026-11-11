import { cx } from '../ui';

const B = import.meta.env.BASE_URL;

/** The Capital O2 globe-and-leaf "O2" emblem (also used as the app icon). */
export function EfieMark({ className }) {
  return <img src={`${B}capitalo2-badge.png`} alt="Capital O2" className={cx('object-contain', className)} />;
}

/** The full Capital O2 logo (wordmark + roots + globe). Its tagline is white, so it sits on dark green. */
export function EfieLogo({ className, light, owner }) {
  const src = owner?.logoWide || `${B}capitalo2-logo.png`;
  return (
    <div className={cx('flex items-center', light && 'rounded-2xl bg-[#0b2e14]/80 px-3 py-1.5 shadow-lg ring-1 ring-white/10', className)}>
      <img src={src} alt="Capital O2 Estates & Hostel" className="h-11 w-auto object-contain sm:h-12" />
    </div>
  );
}

/** The company's (square) logo, editable in Settings → Branding. */
export function CompanyLogo({ owner, className, size = 'md' }) {
  const sz = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl', xl: 'h-24 w-24 text-3xl' }[size];
  const src = owner?.logo || `${B}capitalo2-badge.png`;
  return <img src={src} alt={owner?.company || 'Capital O2'} className={cx('shrink-0 object-contain drop-shadow-sm', sz, className)} />;
}

/** Wide logo for documents (receipts, agreements, reports). */
export function WideLogo({ owner, className }) {
  const src = owner?.logoWide || `${B}capitalo2-logo.png`;
  return <img src={src} alt={owner?.company || 'Capital O2'} className={cx('h-12 w-auto rounded-lg bg-[#0b2e14] object-contain p-1', className)} />;
}
