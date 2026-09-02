'use client';

/**
 * ZATCA-compliant bilingual (AR/EN) tax invoice — A4 print layout.
 * Renders the Phase-1 QR (base64 TLV payload) and all mandatory fields:
 * seller/buyer identity + VAT numbers, invoice number/UUID, issue date,
 * line items with VAT breakdown, totals in SAR.
 */

import React from 'react';
import QRCode from 'qrcode';
import { ZatcaInvoice } from '@/types';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/utils';

function money(v: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
}

export function InvoiceDocument({ invoice }: { invoice: ZatcaInvoice }) {
  const { language } = useLanguageStore();
  const [qrUrl, setQrUrl] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    if (!invoice.qrTlv) { setQrUrl(''); return; }
    QRCode.toDataURL(invoice.qrTlv, { width: 232, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (alive) setQrUrl(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, [invoice.qrTlv]);

  const isCancelled = invoice.status === 'cancelled';
  const isDraft = invoice.status === 'draft';
  const title = invoice.type === 'standard'
    ? { en: 'TAX INVOICE', ar: 'فاتورة ضريبية' }
    : { en: 'SIMPLIFIED TAX INVOICE', ar: 'فاتورة ضريبية مبسطة' };

  return (
    <div className="print-area relative mx-auto w-full max-w-[794px] rounded-md bg-white p-8 text-gray-900 shadow-card" dir="ltr">
      {isCancelled && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-12 rounded-md bg-error/10 px-8 py-3 text-4xl font-black uppercase tracking-widest text-error/40">
            {t('Cancelled', 'ملغاة', language)}
          </span>
        </div>
      )}
      {isDraft && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-12 rounded-md bg-gray-900/5 px-8 py-3 text-4xl font-black uppercase tracking-widest text-gray-900/20">
            {t('Draft', 'مسودة', language)}
          </span>
        </div>
      )}

      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold">{invoice.seller.name}</p>
          <p className="text-sm text-gray-500">{invoice.seller.address}, {invoice.seller.district}</p>
          <p className="text-sm text-gray-500">{invoice.seller.city} {invoice.seller.postalCode} — CR {invoice.seller.crNumber}</p>
          <p className="mt-1 text-sm font-semibold">VAT: <span className="font-mono">{invoice.seller.vatNumber}</span></p>
        </div>
        <div className="text-right" dir="rtl">
          <p className="text-lg font-bold">{invoice.seller.nameAr || invoice.seller.name}</p>
          <p className="text-sm text-gray-500">{invoice.seller.addressAr || invoice.seller.address}</p>
          <p className="text-sm text-gray-500">{invoice.seller.city} {invoice.seller.postalCode}</p>
          <p className="mt-1 text-sm font-semibold">الرقم الضريبي: <span className="font-mono" dir="ltr">{invoice.seller.vatNumber}</span></p>
        </div>
      </div>

      {/* title band */}
      <div className="mt-6 flex items-center justify-between rounded-md bg-gray-900 px-5 py-3 text-white">
        <p className="text-base font-bold tracking-wide">{title.en}</p>
        <p className="text-base font-bold">{title.ar}</p>
      </div>

      {/* meta + QR */}
      <div className="mt-5 flex items-start justify-between gap-6">
        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Invoice No. / رقم الفاتورة</p>
            <p className="font-mono font-semibold">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Issue Date / تاريخ الإصدار</p>
            <p className="font-semibold">{fmtDateTime(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Supply Date / تاريخ التوريد</p>
            <p className="font-semibold">{invoice.supplyDate || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Due Date / تاريخ الاستحقاق</p>
            <p className="font-semibold">{invoice.dueDate || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Invoice UUID</p>
            <p className="break-all font-mono text-xs">{invoice.uuid}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">ICV / PIH</p>
            <p className="font-mono text-xs">
              {isDraft
                ? t('Assigned at issue time', 'يُخصص عند الإصدار', language)
                : <>#{invoice.icv} · {invoice.previousInvoiceHash.slice(0, 24)}…</>}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-center">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="ZATCA QR" className="h-[116px] w-[116px]" />
          ) : (
            <div className="grid h-[116px] w-[116px] place-items-center rounded-md bg-gray-100 px-2 text-center text-[10px] leading-4 text-gray-400">
              {isDraft ? t('QR generated when issued', 'يُنشأ رمز QR عند الإصدار', language) : ''}
            </div>
          )}
          <p className="mt-1 text-[10px] text-gray-400">ZATCA Phase-1 QR</p>
        </div>
      </div>

      {/* buyer */}
      <div className="mt-5 rounded-md bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Buyer / المشتري</p>
            <p className="font-semibold">{invoice.buyer.name}</p>
            {invoice.buyer.address && <p className="text-gray-500">{invoice.buyer.address}{invoice.buyer.city ? `, ${invoice.buyer.city}` : ''}</p>}
            {invoice.buyer.vatNumber && <p className="mt-0.5">VAT: <span className="font-mono font-medium">{invoice.buyer.vatNumber}</span></p>}
            {invoice.buyer.crNumber && <p>CR: <span className="font-mono">{invoice.buyer.crNumber}</span></p>}
          </div>
          {invoice.buyer.nameAr && (
            <div className="text-right" dir="rtl">
              <p className="font-semibold">{invoice.buyer.nameAr}</p>
              {invoice.buyer.addressAr && <p className="text-gray-500">{invoice.buyer.addressAr}</p>}
            </div>
          )}
        </div>
      </div>

      {/* lines */}
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
            <th className="rounded-s-md px-3 py-2 text-start">Description / الوصف</th>
            <th className="px-3 py-2 text-end">Qty / الكمية</th>
            <th className="px-3 py-2 text-end">Unit Price / سعر الوحدة</th>
            <th className="px-3 py-2 text-end">Discount / الخصم</th>
            <th className="px-3 py-2 text-end">Net / الصافي</th>
            <th className="px-3 py-2 text-end">VAT %</th>
            <th className="rounded-e-md px-3 py-2 text-end">VAT / الضريبة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoice.lines.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2.5">
                <p className="font-medium">{l.description}</p>
                {l.descriptionAr && <p className="text-xs text-gray-500" dir="rtl">{l.descriptionAr}</p>}
              </td>
              <td className="px-3 py-2.5 text-end tabular-nums">{l.quantity}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{money(l.unitPrice)}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{l.discount ? money(l.discount) : '—'}</td>
              <td className="px-3 py-2.5 text-end font-medium tabular-nums">{money(l.netAmount)}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{l.vatRate}%</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{money(l.vatAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* totals */}
      <div className="mt-5 flex justify-end">
        <div className="w-full max-w-sm space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (excl. VAT) / الإجمالي قبل الضريبة</span>
            <span className="tabular-nums">{money(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount / الخصم</span>
              <span className="tabular-nums">-{money(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Taxable Amount / المبلغ الخاضع للضريبة</span>
            <span className="tabular-nums">{money(invoice.taxableAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Total VAT / إجمالي ضريبة القيمة المضافة</span>
            <span className="tabular-nums">{money(invoice.vatTotal)}</span>
          </div>
          <div className="flex justify-between rounded-md bg-gray-900 px-3 py-2 text-base font-bold text-white">
            <span>Total / الإجمالي</span>
            <span className="tabular-nums">SAR {money(invoice.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="mt-6 space-y-1 border-t border-gray-100 pt-4 text-xs text-gray-400">
        {invoice.paymentTerms && <p>Payment terms / شروط الدفع: {invoice.paymentTerms}</p>}
        {invoice.notes && <p>{invoice.notes}</p>}
        {invoice.notesAr && <p dir="rtl">{invoice.notesAr}</p>}
        {isCancelled && invoice.cancelReason && (
          <p className="text-error">Cancelled: {invoice.cancelReason} ({invoice.cancelledAt?.slice(0, 10)})</p>
        )}
        {invoice.invoiceHash && (
          <p className="pt-1 font-mono text-[10px] leading-4">Invoice hash (SHA-256): {invoice.invoiceHash}</p>
        )}
      </div>
    </div>
  );
}
