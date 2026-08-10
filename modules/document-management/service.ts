import { api } from '@/lib/api';
import { HRDocument } from '@/types';

export interface DocumentFilters {
  category?: string;
  status?: string;
  search?: string;
}

export interface DocumentAlerts {
  expired: HRDocument[];
  expiringSoon: HRDocument[];
  total: number;
}

export const documentService = {
  getDocuments: (filters?: DocumentFilters) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    return api.get<{ data: HRDocument[]; total: number }>(`/documents${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getDocument: (id: string) => api.get<HRDocument>(`/documents/${id}`),

  getAlerts: () => api.get<DocumentAlerts>('/documents?type=alerts'),

  sendReminders: () => api.post<{ sent: number }>('/documents/reminders', {}),

  createDocument: (data: Partial<HRDocument>) => api.post<HRDocument>('/documents', data),

  updateDocument: (id: string, patch: Partial<HRDocument>) => api.put<HRDocument>(`/documents/${id}`, patch),

  deleteDocument: (id: string) => api.delete<{ success: boolean }>(`/documents/${id}`),
};