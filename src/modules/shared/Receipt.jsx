import { FileDown, Share2 } from 'lucide-react';
import { useStore } from '../../data/store';
import { Modal, Button, printElement } from '../../components/ui';
import { WideLogo } from '../../components/layout/Logo';
import { money, fmtDateTime } from '../../lib/format';
import { METHOD_LABEL } from '../../lib/billing';

export default function ReceiptModal({ payment, onClose }) {
  const s = useStore();
  if (!payment) return null;
  const owner = s.owners.find((o) => o.id === payment.ownerId);
  const tenant = s.tenants.find((t) => t.id === payment.tenantId);
  const unit = s.units.find((u) => u.id === payment.unitId);
  const prop = s.properties.find((p) => p.id === unit?.propertyId);
  const share = async () => {
    const text = `Receipt ${payment.ref}\n${owner.company}\n${tenant?.name} · ${unit?.label}, ${prop?.name}\nAmount: ${money(payment.amount)} via ${METHOD_LABEL[payment.method]}\n${fmtDateTime(payment.at)}`;
    if (navigator.share) await navigator.share({ title: `Receipt ${payment.ref}`, text }).catch(() => {});
    else { await navigator.clipboard?.writeText(text); }
  };
  return (
    <Modal open onClose={onClose} title="Payment receipt" size="md"
      footer={<><Button variant="secondary" icon={Share2} onClick={share}>Share text</Button><Button icon={FileDown} onClick={() => printElement('receipt', `Receipt ${payment.ref}`)}>Download / share PDF</Button></>}>
      <div id="receipt" className="text-slate-800">
        <div className="overflow-hidden rounded-2xl border border-ivory-200 bg-white">
          <div className="flex items-center gap-3 bg-brand-700 p-4 text-white" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
            <WideLogo owner={owner} className="h-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold">{owner.company}</p>
              <p className="truncate text-xs text-white/70">{owner.address} · {owner.phone}</p>
            </div>
            <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-white/60">Receipt</p><p className="font-mono text-sm font-bold">{payment.ref}</p></div>
          </div>
          <div className="kente h-1" />
          <div className="space-y-4 p-5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400">Amount received</p>
              <p className="font-display text-4xl font-semibold text-brand-700">{money(payment.amount)}</p>
              <p className="text-xs text-slate-500">{fmtDateTime(payment.at)} · {METHOD_LABEL[payment.method]}{payment.payer ? ` · ${payment.payer}` : ''}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-ivory-100 p-3 text-sm">
              <div><dt className="text-[10px] uppercase text-slate-400">Received from</dt><dd className="font-semibold">{tenant?.name}</dd></div>
              <div><dt className="text-[10px] uppercase text-slate-400">Property</dt><dd className="font-semibold">{unit?.label} · {prop?.name}</dd></div>
            </dl>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-ivory-200 text-left text-[10px] uppercase text-slate-400"><th className="py-1.5">For</th><th className="py-1.5 text-right">Amount</th></tr></thead>
              <tbody>
                {payment.allocations.map((a) => {
                  const inv = s.invoices.find((i) => i.id === a.invoiceId);
                  return <tr key={a.invoiceId} className="border-b border-ivory-100"><td className="py-2">{inv?.title || 'Rent'}</td><td className="py-2 text-right font-semibold">{money(a.amount)}</td></tr>;
                })}
                {payment.credit > 0 && <tr><td className="py-2">Credit (advance)</td><td className="py-2 text-right font-semibold">{money(payment.credit)}</td></tr>}
              </tbody>
              <tfoot><tr><td className="pt-3 font-bold">Total</td><td className="pt-3 text-right font-extrabold">{money(payment.amount)}</td></tr></tfoot>
            </table>
            {payment.test && <p className="text-center text-[11px] font-semibold text-amber-600">DEMO RECEIPT — no real money moved</p>}
            <p className="border-t border-dashed border-ivory-300 pt-3 text-center text-[10px] uppercase tracking-widest text-slate-400">{owner.company}{owner.tagline ? ` · ${owner.tagline}` : ''}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
