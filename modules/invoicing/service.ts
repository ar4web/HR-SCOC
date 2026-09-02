import { api } from '@/lib/api';
import { ZatcaInvoice, ZatcaSettings, InvoiceParty, InvoiceType } from '@/types';

export interface InvoiceStats {
  total: number;
  drafts: number;
  issued: number;
  cancelled: number;
  monthCount: number;
  monthTotal: number;
  monthVat: number;
  totalVat: number;
  totalAmount: number;
}

export interface ChainStatus {
  ok: boolean;
  checked: number;
  brokenAt?: string;
}

export interface InvoiceLinePayload {
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate?: number;
}

export interface InvoiceCreatePayload {
  type: InvoiceType;
  buyer: InvoiceParty;
  lines: InvoiceLinePayload[];
  discount?: number;
  dueDate?: string;
  supplyDate?: string;
  paymentTerms?: string;
  notes?: string;
  notesAr?: string;
  issueNow?: boolean;
}

export const invoicingService = {
  getInvoices: (filters?: { status?: string; invoiceType?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.invoiceType) params.set('invoiceType', filters.invoiceType);
    if (filters?.search) params.set('search', filters.search);
    return api.get<{ data: ZatcaInvoice[]; total: number }>(`/invoices${params.toString() ? `?${params}` : ''}`);
  },

  getInvoice: (id: string) => api.get<ZatcaInvoice>(`/invoices/${id}`),

  getStats: () => api.get<InvoiceStats>('/invoices?type=stats'),

  getChainStatus: () => api.get<ChainStatus>('/invoices?type=chain'),

  getSettings: () => api.get<ZatcaSettings>('/invoices?type=settings'),

  updateSettings: (patch: Partial<ZatcaSettings>) => api.put<ZatcaSettings>('/invoices', patch),

  createInvoice: (payload: InvoiceCreatePayload) => api.post<ZatcaInvoice>('/invoices', payload),

  issueDraft: (id: string) => api.put<ZatcaInvoice>(`/invoices/${id}`, { action: 'issue' }),

  cancelInvoice: (id: string, reason: string) => api.put<ZatcaInvoice>(`/invoices/${id}`, { action: 'cancel', reason }),

  deleteDraft: (id: string) => api.delete<{ success: boolean }>(`/invoices/${id}`),
};
