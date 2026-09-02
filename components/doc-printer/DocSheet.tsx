'use client';

/**
 * Doc Printer — the printable bilingual sheet.
 *
 * Layout per user spec: English (LTR) on the LEFT column, Arabic (RTL)
 * on the RIGHT column, paragraph-aligned side by side. Letterhead with
 * uploaded logo, footer with signature + official seal overlay.
 * Paper size is applied via inline dimensions + @page CSS for print.
 */

import React from 'react';
import { DocPrinterAssets } from '@/types';
import { PaperSize, PAPER_SIZES } from '@/lib/doc-templates';

export interface DocSheetData {
  titleEn: string;
  titleAr: string;
  refNumber: string;
  dateStr: string;
  paragraphsEn: string[];
  paragraphsAr: string[];
  salaryRows?: { labelEn: string; labelAr: string; value: string }[];
  employeeSigns?: boolean;
  employeeName?: string;
  employeeNameAr?: string;
  companyName: string;
  companyNameAr: string;
}

interface DocSheetProps {
  data: DocSheetData;
  assets: DocPrinterAssets;
  paper: PaperSize;
  showSeal: boolean;
}

export function DocSheet({ data, assets, paper, showSeal }: DocSheetProps) {
  const size = PAPER_SIZES[paper];
  // on-screen scale: mm -> px at ~3.2px/mm for A4 readability, clamped by container
  const pairs = Math.max(data.paragraphsEn.length, data.paragraphsAr.length);

  return (
    <>
      {/* print page size */}
      <style>{`@media print { @page { size: ${size.css}; margin: 0; } }`}</style>
      <div
        className="print-area relative mx-auto flex flex-col bg-white text-gray-900 shadow-card"
        style={{
          width: '100%',
          maxWidth: `${size.w * 3.2}px`,
          minHeight: `${size.h * 3.2}px`,
          padding: `${paper === 'a5' ? 28 : 40}px`,
        }}
        dir="ltr"
      >
        {/* letterhead */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-4">
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight">{data.companyName}</p>
            <p className="text-[11px] text-gray-500">Kingdom of Saudi Arabia</p>
          </div>
          <div className="grid h-16 w-24 shrink-0 place-items-center">
            {assets.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assets.logo} alt="logo" className="max-h-16 max-w-24 object-contain" draggable={false} />
            ) : (
              <span className="rounded-md bg-gray-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-300">Logo</span>
            )}
          </div>
          <div className="min-w-0 text-right" dir="rtl">
            <p className="text-base font-bold leading-tight">{data.companyNameAr}</p>
            <p className="text-[11px] text-gray-500">المملكة العربية السعودية</p>
          </div>
        </div>

        {/* ref + date */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
          <span>Ref: <span className="font-mono">{data.refNumber}</span></span>
          <span dir="rtl">التاريخ: <span dir="ltr" className="font-mono">{data.dateStr}</span></span>
        </div>

        {/* title */}
        <div className="mt-5 text-center">
          <p className="text-lg font-bold uppercase tracking-wide">{data.titleEn}</p>
          <p className="mt-0.5 text-lg font-bold" dir="rtl">{data.titleAr}</p>
          <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-900" />
        </div>

        {/* bilingual body: EN left / AR right, row-aligned */}
        <div className="mt-6 flex-1 space-y-4">
          {Array.from({ length: pairs }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-6">
              <p className="text-[12.5px] leading-6 text-gray-800" dir="ltr">
                {data.paragraphsEn[i] || ''}
              </p>
              <p className="text-right text-[13px] leading-7 text-gray-800" dir="rtl">
                {data.paragraphsAr[i] || ''}
              </p>
            </div>
          ))}

          {/* salary table */}
          {data.salaryRows && data.salaryRows.length > 0 && (
            <table className="mt-2 w-full text-[12px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="rounded-s-md px-3 py-1.5 text-start font-semibold">Component</th>
                  <th className="px-3 py-1.5 text-center font-semibold">SAR / ريال</th>
                  <th className="rounded-e-md px-3 py-1.5 text-end font-semibold" dir="rtl">البند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.salaryRows.map((r, i) => (
                  <tr key={i} className={i === data.salaryRows!.length - 1 ? 'font-bold' : ''}>
                    <td className="px-3 py-1.5">{r.labelEn}</td>
                    <td className="px-3 py-1.5 text-center font-mono tabular-nums">{r.value}</td>
                    <td className="px-3 py-1.5 text-end" dir="rtl">{r.labelAr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* signature blocks */}
        <div className="relative mt-10 grid grid-cols-2 gap-6">
          <div className="text-[11px]">
            <p className="font-semibold text-gray-700">For {data.companyName}</p>
            <p className="text-gray-400" dir="rtl">عن {data.companyNameAr}</p>
            <div className="relative mt-2 h-20">
              {assets.signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assets.signature} alt="signature" className="absolute bottom-1 start-0 max-h-16 max-w-[160px] object-contain" draggable={false} />
              )}
              {showSeal && assets.seal && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assets.seal}
                  alt="seal"
                  className="absolute -top-4 start-24 h-24 w-24 -rotate-12 object-contain opacity-80 mix-blend-multiply"
                  draggable={false}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 border-t border-gray-300" />
            </div>
            <p className="mt-1 font-semibold">{assets.signatoryName || 'Authorized Signatory'}</p>
            <p className="text-gray-500">{assets.signatoryTitle || 'Human Resources'}{assets.signatoryTitleAr ? ` — ${assets.signatoryTitleAr}` : ''}</p>
          </div>
          {data.employeeSigns ? (
            <div className="text-end text-[11px]" dir="rtl">
              <p className="font-semibold text-gray-700">توقيع الموظف / Employee Signature</p>
              <p className="text-gray-400">{data.employeeNameAr || data.employeeName || ''}</p>
              <div className="mt-2 h-20 border-b border-gray-300" />
              <p className="mt-1 text-gray-500">الاسم: {data.employeeNameAr || '____________'} — التوقيع: ____________ — التاريخ: ____________</p>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* footer */}
        <div className="mt-6 border-t border-gray-100 pt-2 text-center text-[9px] text-gray-400">
          <p>{data.companyName} — Generated by SCOS HR • {data.refNumber} • {data.dateStr}</p>
        </div>
      </div>
    </>
  );
}
