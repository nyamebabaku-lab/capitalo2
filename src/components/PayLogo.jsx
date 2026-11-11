// Official payment brand marks (MTN MoMo, Telecel Cash, AT Money, Visa/Mastercard) shown on payment choices.
import { Banknote } from 'lucide-react';
import { cx } from './ui';

const B = `${import.meta.env.BASE_URL}brands/`;

export default function PayLogo({ method, className }) {
  const box = cx('flex h-10 w-14 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/5', className);
  if (method === 'mtn') return <span className={cx(box, 'bg-[#ffcb05] p-1.5')}><img src={`${B}mtn.svg`} alt="MTN MoMo" className="max-h-full" /></span>;
  if (method === 'telecel') return <span className={cx(box, 'bg-white p-1')}><img src={`${B}telecel-cash.png`} alt="Telecel Cash" className="max-h-full" /></span>;
  if (method === 'at') return <span className={cx(box, 'bg-white p-1')}><img src={`${B}at-money.png`} alt="AT Money" className="max-h-full" /></span>;
  if (method === 'card')
    return (
      <span className={cx(box, 'gap-0.5 bg-white px-1')}>
        <img src={`${B}visa.svg`} alt="Visa" className="h-3 w-auto" />
        <img src={`${B}mastercard.svg`} alt="Mastercard" className="h-4 w-auto" />
      </span>
    );
  return <span className={cx(box, 'bg-emerald-600 text-white')}><Banknote className="h-5 w-5" /></span>;
}
