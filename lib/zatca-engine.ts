/**
 * ZATCA e-invoicing engine — Saudi Fatoora compliance (Phase 1 "Generation").
 *
 * Implements:
 * - TLV (tag-length-value) QR payload per ZATCA e-invoicing QR spec:
 *     tag 1: seller name (UTF-8)
 *     tag 2: seller VAT registration number
 *     tag 3: invoice timestamp (ISO 8601)
 *     tag 4: invoice total with VAT
 *     tag 5: VAT amount
 *     tag 6: SHA-256 invoice hash (Phase-2 readiness)
 *   Payload is base64-encoded, embedded in a QR code on every invoice.
 * - Invoice hash chaining (PIH — previous invoice hash) with a monotonically
 *   increasing invoice counter value (ICV), per ZATCA XML implementation
 *   standard concepts.
 * - Saudi VAT rules: 15% standard rate, VAT-number validation
 *   (15 digits, starts and ends with '3'), SAR rounding to 2 decimals
 *   (half-up), tax-invoice vs simplified-tax-invoice distinction.
 *
 * Server-side only where hashing is involved (uses node:crypto lazily so the
 * module stays importable from shared code paths).
 */

import {
  ZatcaInvoice,
  ZatcaSettings,
  InvoiceLine,
  InvoiceParty,
  InvoiceType,
} from '@/types';
import {
  zatcaInvoices,
  zatcaSettings,
  saveZatcaSettings,
  addZatcaInvoice,
  updateZatcaInvoice,
  addNotification,
} from '@/lib/mock-data';
import { generateId } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* money helpers — SAR, 2dp, half-up rounding                          */
/* ------------------------------------------------------------------ */

export function roundSar(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* VAT number validation                                               */
/* ------------------------------------------------------------------ */

/** Saudi VAT registration number: exactly 15 digits, starts & ends with 3. */
export function isValidSaudiVat(vat: string): boolean {
  return /^3\d{13}3$/.test(vat);
}

/* ------------------------------------------------------------------ */
/* TLV QR payload (ZATCA Phase-1 spec)                                 */
/* ------------------------------------------------------------------ */

function tlvTag(tag: number, value: string): Uint8Array {
  let encoded = new TextEncoder().encode(value);
  if (encoded.length > 255) {
    // TLV length field is a single byte — truncate at a valid UTF-8 boundary
    // instead of crashing (multi-byte Arabic names can exceed 255 bytes even
    // within schema char limits).
    let end = 255;
    while (end > 0 && (encoded[end] & 0xc0) === 0x80) end--;
    encoded = encoded.slice(0, end);
  }
  const out = new Uint8Array(2 + encoded.length);
  out[0] = tag;
  out[1] = encoded.length;
  out.set(encoded, 2);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export interface QrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string;   // ISO 8601
  total: number;       // invoice total incl. VAT
  vatAmount: number;
  invoiceHash?: string;
}

/** Build the base64 TLV payload embedded in the ZATCA QR code. */
export function buildQrTlv(f: QrFields): string {
  const parts = [
    tlvTag(1, f.sellerName),
    tlvTag(2, f.vatNumber),
    tlvTag(3, f.timestamp),
    tlvTag(4, f.total.toFixed(2)),
    tlvTag(5, f.vatAmount.toFixed(2)),
  ];
  if (f.invoiceHash) parts.push(tlvTag(6, f.invoiceHash.slice(0, 64)));
  return bytesToBase64(concatBytes(parts));
}

/** Decode a base64 TLV payload back into tag→value map (for verification). */
export function decodeQrTlv(b64: string): Record<number, string> {
  const raw = typeof Buffer !== 'undefined'
    ? new Uint8Array(Buffer.from(b64, 'base64'))
    : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const out: Record<number, string> = {};
  let i = 0;
  const decoder = new TextDecoder();
  while (i + 2 <= raw.length) {
    const tag = raw[i];
    const len = raw[i + 1];
    out[tag] = decoder.decode(raw.slice(i + 2, i + 2 + len));
    i += 2 + len;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* hashing & chaining                                                  */
/* ------------------------------------------------------------------ */

function sha256Hex(input: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
}

/** Genesis PIH per ZATCA convention: base64 of "0" -> here hex-of-zero seed. */
export const GENESIS_HASH = '0'.repeat(64);

function canonicalPayload(inv: Omit<ZatcaInvoice, 'invoiceHash' | 'qrTlv' | 'createdAt' | 'updatedAt'>): string {
  return JSON.stringify({
    uuid: inv.uuid,
    invoiceNumber: inv.invoiceNumber,
    issueDate: inv.issueDate,
    sellerVat: inv.seller.vatNumber,
    buyerVat: inv.buyer.vatNumber || '',
    total: inv.grandTotal.toFixed(2),
    vat: inv.vatTotal.toFixed(2),
    icv: inv.icv,
    pih: inv.previousInvoiceHash,
    lines: inv.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.vatRate, l.totalAmount]),
  });
}

/* ------------------------------------------------------------------ */
/* totals                                                              */
/* ------------------------------------------------------------------ */

export interface LineInput {
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate?: number;
}

export function computeLine(input: LineInput): InvoiceLine {
  const quantity = Math.max(0, input.quantity);
  const unitPrice = Math.max(0, input.unitPrice);
  const discount = roundSar(Math.max(0, input.discount || 0));
  const vatRate = input.vatRate ?? 15;
  const gross = roundSar(quantity * unitPrice);
  const netAmount = roundSar(Math.max(0, gross - discount));
  const vatAmount = roundSar(netAmount * (vatRate / 100));
  return {
    id: generateId(),
    description: input.description,
    descriptionAr: input.descriptionAr,
    quantity,
    unitPrice,
    discount,
    vatRate,
    netAmount,
    vatAmount,
    totalAmount: roundSar(netAmount + vatAmount),
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  vatTotal: number;
  grandTotal: number;
}

export function computeTotals(lines: InvoiceLine[], invoiceDiscount = 0): InvoiceTotals {
  const subtotal = roundSar(lines.reduce((s, l) => s + l.netAmount, 0));
  const discount = roundSar(Math.min(Math.max(0, invoiceDiscount), subtotal));
  const taxableAmount = roundSar(subtotal - discount);
  // Distribute invoice-level discount proportionally for VAT purposes
  const ratio = subtotal > 0 ? taxableAmount / subtotal : 0;
  const vatTotal = roundSar(lines.reduce((s, l) => s + l.netAmount * ratio * (l.vatRate / 100), 0));
  return {
    subtotal,
    discount,
    taxableAmount,
    vatTotal,
    grandTotal: roundSar(taxableAmount + vatTotal),
  };
}

/* ------------------------------------------------------------------ */
/* CRUD + issuing                                                      */
/* ------------------------------------------------------------------ */

export interface CreateInvoiceInput {
  type: InvoiceType;
  buyer: InvoiceParty;
  lines: LineInput[];
  discount?: number;
  dueDate?: string;
  supplyDate?: string;
  paymentTerms?: string;
  notes?: string;
  notesAr?: string;
  createdBy: string;
  issueNow?: boolean;
}

export function getZatcaSettings(): ZatcaSettings {
  return zatcaSettings();
}

export function updateZatcaSettings(patch: Partial<ZatcaSettings>): ZatcaSettings {
  const merged = { ...zatcaSettings(), ...patch };
  saveZatcaSettings(merged);
  return merged;
}

export function getInvoices(filters?: { status?: string; type?: string; search?: string }): ZatcaInvoice[] {
  // Newest first; drafts have icv 0 so sort by creation time, not ICV.
  let data = Array.from(zatcaInvoices().values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (filters?.status) data = data.filter((i) => i.status === filters.status);
  if (filters?.type) data = data.filter((i) => i.type === filters.type);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.buyer.name.toLowerCase().includes(q) ||
        (i.buyer.nameAr || '').toLowerCase().includes(q) ||
        (i.buyer.vatNumber || '').includes(q) ||
        i.uuid.includes(q)
    );
  }
  return data;
}

export function getInvoice(id: string): ZatcaInvoice | undefined {
  return zatcaInvoices().get(id);
}

/**
 * Chained invoices = invoices that have been issued at least once (icv > 0).
 * Drafts hold icv 0 and a DRAFT- placeholder number; they get their final
 * sequential number, ICV, PIH, hash and QR only at issue time. Issued
 * invoices are never deletable, so ICV/numbers can never be reused.
 */
function chainedInvoices(): ZatcaInvoice[] {
  return Array.from(zatcaInvoices().values())
    .filter((i) => i.icv > 0)
    .sort((a, b) => a.icv - b.icv);
}

function nextInvoiceNumber(prefix: string): { number: string; icv: number } {
  const chained = chainedInvoices();
  const icv = chained.length === 0 ? 1 : chained[chained.length - 1].icv + 1;
  const year = new Date().getFullYear();
  return { number: `${prefix}-${year}-${String(icv).padStart(4, '0')}`, icv };
}

function lastInvoiceHash(): string {
  const chained = chainedInvoices();
  const last = chained[chained.length - 1];
  return last ? last.invoiceHash : GENESIS_HASH;
}

function draftNumber(): string {
  return `DRAFT-${String(Date.now()).slice(-6)}`;
}

function makeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.randomUUID();
}

export function createInvoice(input: CreateInvoiceInput):
  { invoice: ZatcaInvoice } | { error: string } {
  const settings = zatcaSettings();

  if (!isValidSaudiVat(settings.vatNumber)) {
    return { error: 'Seller VAT number is invalid — configure a valid 15-digit VAT number (starts/ends with 3) in invoice settings.' };
  }
  if (input.type === 'standard') {
    // B2B tax invoice requires a buyer VAT number
    if (!input.buyer.vatNumber || !isValidSaudiVat(input.buyer.vatNumber)) {
      return { error: 'Standard (B2B) tax invoices require a valid buyer VAT number.' };
    }
  } else if (input.buyer.vatNumber && !isValidSaudiVat(input.buyer.vatNumber)) {
    // B2C: buyer VAT optional, but if provided it must be valid
    return { error: 'Buyer VAT number is invalid — must be 15 digits, starting and ending with 3.' };
  }
  if (!input.buyer.name?.trim()) return { error: 'Buyer name is required.' };
  if (!input.lines?.length) return { error: 'At least one invoice line is required.' };
  for (const l of input.lines) {
    if (!l.description?.trim()) return { error: 'Every line needs a description.' };
    if (!(l.quantity > 0)) return { error: 'Line quantity must be greater than zero.' };
    if (l.unitPrice < 0) return { error: 'Line unit price cannot be negative.' };
    if (l.vatRate !== undefined && ![0, 5, 15].includes(l.vatRate)) {
      return { error: 'VAT rate must be 0%, 5% or 15%.' };
    }
  }

  const lines = input.lines.map(computeLine);
  const totals = computeTotals(lines, input.discount || 0);
  const isDraft = input.issueNow === false;
  // Drafts stay OUTSIDE the chain: no ICV, no PIH, placeholder number.
  // They join the chain (final number/ICV/PIH/hash/QR) only when issued.
  const { number, icv } = isDraft
    ? { number: draftNumber(), icv: 0 }
    : nextInvoiceNumber(settings.invoicePrefix || 'INV');
  const now = new Date().toISOString();
  const pih = isDraft ? '' : lastInvoiceHash();

  const seller: InvoiceParty = {
    name: settings.sellerName,
    nameAr: settings.sellerNameAr,
    vatNumber: settings.vatNumber,
    crNumber: settings.crNumber,
    address: settings.address,
    addressAr: settings.addressAr,
    city: settings.city,
    postalCode: settings.postalCode,
    buildingNumber: settings.buildingNumber,
    district: settings.district,
  };

  const base: Omit<ZatcaInvoice, 'invoiceHash' | 'qrTlv' | 'createdAt' | 'updatedAt'> = {
    id: generateId(),
    invoiceNumber: number,
    uuid: makeUuid(),
    type: input.type,
    status: isDraft ? 'draft' : 'issued',
    issueDate: now,
    dueDate: input.dueDate,
    supplyDate: input.supplyDate || now.slice(0, 10),
    seller,
    buyer: input.buyer,
    lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxableAmount: totals.taxableAmount,
    vatTotal: totals.vatTotal,
    grandTotal: totals.grandTotal,
    currency: 'SAR',
    paymentTerms: input.paymentTerms || settings.defaultPaymentTerms,
    notes: input.notes,
    notesAr: input.notesAr,
    previousInvoiceHash: pih,
    icv,
    createdBy: input.createdBy,
  };

  // Drafts carry no hash/QR — those are legal artifacts minted at issue time.
  const invoiceHash = isDraft ? '' : sha256Hex(canonicalPayload(base));
  const qrTlv = isDraft
    ? ''
    : buildQrTlv({
        sellerName: seller.name,
        vatNumber: seller.vatNumber || '',
        timestamp: now,
        total: totals.grandTotal,
        vatAmount: totals.vatTotal,
        invoiceHash,
      });

  const invoice: ZatcaInvoice = { ...base, invoiceHash, qrTlv, createdAt: now, updatedAt: now };
  addZatcaInvoice(invoice);

  addNotification({
    userId: input.createdBy,
    companyId: 'demo-company',
    read: false,
    type: 'success',
    title: `Invoice ${number} ${invoice.status === 'issued' ? 'issued' : 'saved as draft'}`,
    titleAr: `الفاتورة ${number} ${invoice.status === 'issued' ? 'صادرة' : 'محفوظة كمسودة'}`,
    message: `${input.buyer.name} — SAR ${totals.grandTotal.toFixed(2)} (VAT ${totals.vatTotal.toFixed(2)})`,
    messageAr: `${input.buyer.nameAr || input.buyer.name} — ${totals.grandTotal.toFixed(2)} ريال`,
  });

  return { invoice };
}

/**
 * ZATCA prohibits deleting issued invoices — they can only be cancelled
 * (and in real Phase-2 flows, adjusted via credit notes). Drafts can change.
 */
export function issueDraft(id: string): { invoice: ZatcaInvoice } | { error: string } {
  const inv = zatcaInvoices().get(id);
  if (!inv) return { error: 'Invoice not found' };
  if (inv.status !== 'draft') return { error: 'Only draft invoices can be issued' };
  const settings = zatcaSettings();
  if (!isValidSaudiVat(settings.vatNumber)) {
    return { error: 'Seller VAT number is invalid — fix invoice settings before issuing.' };
  }
  const now = new Date().toISOString();
  // The draft joins the chain NOW: it takes the next number/ICV and links
  // to the current chain head, so issuing an old draft never breaks the chain.
  const { number, icv } = nextInvoiceNumber(settings.invoicePrefix || 'INV');
  const pih = lastInvoiceHash();
  const updated: ZatcaInvoice = {
    ...inv,
    status: 'issued',
    invoiceNumber: number,
    icv,
    previousInvoiceHash: pih,
    issueDate: now,
    updatedAt: now,
  };
  const { invoiceHash: _oldHash, qrTlv: _oldQr, createdAt, updatedAt, ...baseRest } = updated;
  void _oldHash; void _oldQr; void createdAt; void updatedAt;
  const invoiceHash = sha256Hex(canonicalPayload({ ...baseRest }));
  const qrTlv = buildQrTlv({
    sellerName: inv.seller.name,
    vatNumber: inv.seller.vatNumber || '',
    timestamp: now,
    total: inv.grandTotal,
    vatAmount: inv.vatTotal,
    invoiceHash,
  });
  const final = { ...updated, invoiceHash, qrTlv };
  updateZatcaInvoice(final);
  return { invoice: final };
}

export function cancelInvoice(id: string, reason: string): { invoice: ZatcaInvoice } | { error: string } {
  const inv = zatcaInvoices().get(id);
  if (!inv) return { error: 'Invoice not found' };
  if (inv.status === 'cancelled') return { error: 'Invoice is already cancelled' };
  if (inv.status === 'draft') return { error: 'Drafts are never issued — delete them instead of cancelling' };
  if (!reason?.trim()) return { error: 'A cancellation reason is required' };
  const now = new Date().toISOString();
  const updated: ZatcaInvoice = { ...inv, status: 'cancelled', cancelledAt: now, cancelReason: reason.trim(), updatedAt: now };
  updateZatcaInvoice(updated);
  return { invoice: updated };
}

export function deleteDraft(id: string): { success: true } | { error: string } {
  const inv = zatcaInvoices().get(id);
  if (!inv) return { error: 'Invoice not found' };
  if (inv.status !== 'draft') {
    return { error: 'Issued invoices cannot be deleted under ZATCA rules — cancel instead' };
  }
  zatcaInvoices().delete(id);
  updateZatcaInvoice(null); // trigger persist
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* stats & chain verification                                          */
/* ------------------------------------------------------------------ */

export function getInvoiceStats() {
  const all = Array.from(zatcaInvoices().values());
  const issued = all.filter((i) => i.status !== 'draft' && i.status !== 'cancelled');
  const now = new Date();
  const thisMonth = issued.filter((i) => {
    const d = new Date(i.issueDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  return {
    total: all.length,
    drafts: all.filter((i) => i.status === 'draft').length,
    issued: issued.length,
    cancelled: all.filter((i) => i.status === 'cancelled').length,
    monthCount: thisMonth.length,
    monthTotal: roundSar(thisMonth.reduce((s, i) => s + i.grandTotal, 0)),
    monthVat: roundSar(thisMonth.reduce((s, i) => s + i.vatTotal, 0)),
    totalVat: roundSar(issued.reduce((s, i) => s + i.vatTotal, 0)),
    totalAmount: roundSar(issued.reduce((s, i) => s + i.grandTotal, 0)),
  };
}

/**
 * Walk the ICV chain and verify each issued invoice links to its
 * predecessor. Drafts (icv 0) are outside the chain by design.
 */
export function verifyChain(): { ok: boolean; checked: number; brokenAt?: string } {
  const chained = chainedInvoices();
  let prev = GENESIS_HASH;
  for (const inv of chained) {
    if (inv.previousInvoiceHash !== prev) {
      return { ok: false, checked: chained.length, brokenAt: inv.invoiceNumber };
    }
    prev = inv.invoiceHash;
  }
  return { ok: true, checked: chained.length };
}
