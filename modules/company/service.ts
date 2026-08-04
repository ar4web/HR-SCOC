import { api } from '@/lib/api';
import { Company, Branding, CompanySettings } from '@/types';

export const companyService = {
  get: () => api.get<Company>('/company'),

  update: (updates: Partial<Company>) =>
    api.put<Company>('/company', updates),

  updateBranding: (branding: Branding) =>
    api.put<Company>('/company', { branding }),

  updateSettings: (settings: Partial<CompanySettings>) =>
    api.put<Company>('/company', { settings }),
};
