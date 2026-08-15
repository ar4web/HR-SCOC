import { api } from '@/lib/api';
import { Contract, ContractStatus } from '@/types';

export interface ContractsResponse {
  data: Contract[];
  summary: {
    total: number;
    active: number;
    expiring: number;
    expired: number;
    totalValue: number;
  };
  employees: Array<{ id: string; employeeId: string; fullName: string }>;
}

export const contractsService = {
  list: (params?: { status?: ContractStatus | 'all'; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return api.get<ContractsResponse>(`/contracts${qs ? `?${qs}` : ''}`);
  },

  create: (data: {
    contractType: string;
    title: string;
    partyB: string;
    employeeId?: string;
    startDate: string;
    endDate: string;
    renewalNoticeDays: number;
    value: number;
    currency: string;
    notes?: string;
  }) => api.post<Contract>('/contracts', data),

  update: (id: string, patch: Partial<Contract>) =>
    api.put<Contract>(`/contracts/${id}`, patch),

  remove: (id: string) => api.delete<{ success: boolean }>(`/contracts/${id}`),
};