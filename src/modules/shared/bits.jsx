import { Badge } from '../../components/ui';
import { STATUS_TONE, invoiceStatus, METHOD_LABEL } from '../../lib/billing';
import PayLogo from '../../components/PayLogo';

export const Status = ({ s }) => <Badge tone={STATUS_TONE[s] || 'slate'} dot className="capitalize">{s}</Badge>;
export const InvStatus = ({ inv }) => <Status s={invoiceStatus(inv)} />;
export function Method({ m, compact }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2" title={METHOD_LABEL[m] || m}>
      <PayLogo method={['mtn', 'telecel', 'at', 'card'].includes(m) ? m : 'cash'} className="h-6 w-9 rounded-lg" />
      {!compact && <span className="text-xs font-medium">{METHOD_LABEL[m] || m}</span>}
    </span>
  );
}
export function Mini({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-ivory-100 p-3 dark:bg-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${tone || 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}
