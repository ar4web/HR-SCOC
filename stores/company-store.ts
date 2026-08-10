import { create } from 'zustand';
import { Company, Branding, CompanySettings } from '@/types';
import { companyService } from '@/modules/company/service';

interface CompanyState {
  company: Company | null;
  isLoading: boolean;
  fetchCompany: () => Promise<void>;
  setCompany: (company: Company) => void;
  updateCompany: (updates: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
  updateBranding: (branding: Branding) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<{ success: boolean; error?: string }>;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  company: null,
  isLoading: true,

  fetchCompany: async () => {
    const res = await companyService.get();
    if (res.success && res.data) {
      set({ company: res.data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  setCompany: (company) => set({ company, isLoading: false }),

  updateCompany: async (updates) => {
    const res = await companyService.update(updates);
    if (res.success && res.data) {
      set({ company: res.data });
      return { success: true };
    }
    return { success: false, error: res.error };
  },

  updateBranding: async (branding) => {
    const res = await companyService.updateBranding(branding);
    if (res.success && res.data) {
      set({ company: res.data });
      return { success: true };
    }
    return { success: false, error: res.error };
  },

  updateSettings: async (settings) => {
    const res = await companyService.updateSettings(settings);
    if (res.success && res.data) {
      set({ company: res.data });
      return { success: true };
    }
    return { success: false, error: res.error };
  },
}));
