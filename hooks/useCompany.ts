import { useAuthStore } from '@/stores/auth-store';
import { useCompanyStore } from '@/stores/company-store';
import { useEffect } from 'react';

export function useCompany() {
  const { user } = useAuthStore();
  const { company, isLoading, fetchCompany } = useCompanyStore();

  useEffect(() => {
    if (user && !company && !isLoading) {
      fetchCompany();
    }
  }, [user, company, isLoading, fetchCompany]);

  return { company, isLoading };
}
