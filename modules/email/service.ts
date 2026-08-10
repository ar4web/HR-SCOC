import { api } from '@/lib/api';
import { EmailTemplate, EmailSettings } from '@/types';

export interface EmailTemplateFilters {
  category?: string;
  search?: string;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  authUrl?: string | null;
  authMissing?: boolean;
}

export const emailService = {
  getSettings: () => api.get<EmailSettings>('/email?type=settings'),

  updateSettings: (settings: Partial<EmailSettings>) =>
    api.post<EmailSettings>('/email', { action: 'settings', ...settings }),

  gmailStatus: () => api.get<GmailStatus>('/email/gmail?action=status'),

  gmailAuth: () => api.get<{ url: string }>('/email/gmail?action=auth'),

  gmailConnect: (code: string) => api.put<{ accountEmail: string; accountName: string }>('/email/gmail', { code }),

  gmailDisconnect: () => api.post<{ success: boolean }>('/email/gmail', { action: 'disconnect' }),

  getTemplates: (filters?: EmailTemplateFilters) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    return api.get<{ data: EmailTemplate[]; total: number }>(
      `/email?type=templates${params.toString() ? `&${params.toString()}` : ''}`
    );
  },

  getTemplate: (id: string) => api.get<EmailTemplate>(`/email/templates/${id}`),

  createTemplate: (data: Partial<EmailTemplate>) =>
    api.post<EmailTemplate>('/email', { action: 'template', ...data }),

  updateTemplate: (id: string, patch: Partial<EmailTemplate>) =>
    api.put<EmailTemplate>(`/email/templates/${id}`, patch),

  deleteTemplate: (id: string) => api.delete<{ success: boolean }>(`/email/templates/${id}`),

  sendTest: () => api.post<{ success: boolean; message: string }>('/email', { action: 'test' }),

  send: (data: { to: { name?: string; email: string }[]; subject: string; body: string; templateId?: string }) =>
    api.post<{ success: boolean; message: string; id?: string }>('/email', { action: 'send', ...data }),

  deliver: (id?: string) =>
    api.post<{ success: boolean; message?: string; id?: string; delivered?: number; failed?: number; error?: string }>('/email', { action: 'deliver', ...(id ? { id } : {}) }),

  getOutbox: () => api.get<{ data: { id: string; toEmail: string; toName?: string; subject: string; status: string; createdAt: string }[]; total: number }>('/email?type=outbox'),
};