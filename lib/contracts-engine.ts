import { Contract, ContractStatus, AgreementType, Employee } from '@/types';
import { contracts, employees, addContract, updateContract, deleteContract } from '@/lib/mock-data';

export const CONTRACT_TYPES: Array<{ value: AgreementType; en: string; ar: string }> = [
  { value: 'employment', en: 'Employment Contract', ar: 'عقد عمل' },
  { value: 'service', en: 'Service Agreement', ar: 'اتفاقية خدمة' },
  { value: 'nda', en: 'NDA', ar: 'اتفاقية عدم إفصاح' },
  { value: 'vendor', en: 'Vendor Agreement', ar: 'اتفاقية مورد' },
  { value: 'client', en: 'Client Agreement', ar: 'اتفاقية عميل' },
  { value: 'contractor', en: 'Contractor Agreement', ar: 'اتفاقية مقاول' },
  { value: 'partnership', en: 'Partnership Agreement', ar: 'اتفاقية شراكة' },
  { value: 'lease', en: 'Lease Agreement', ar: 'عقد إيجار' },
  { value: 'amendment', en: 'Amendment', ar: 'تعديل' },
];

export function daysUntil(date: string): number {
  const end = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

export function contractState(c: Contract): ContractStatus {
  const days = daysUntil(c.endDate);
  if (days < 0) return 'expired';
  if (days <= c.renewalNoticeDays) return 'expiring';
  return 'active';
}

export function enrichContract(c: Contract): Contract & { days: number } {
  return { ...c, days: daysUntil(c.endDate) };
}

export function computeStatus(c: Contract): Contract {
  const state = contractState(c);
  return state === c.status ? c : { ...c, status: state };
}

export function listContracts(filter?: { status?: ContractStatus | 'all'; search?: string }): Contract[] {
  let list = Array.from(contracts.values()).map(enrichContract);
  if (filter?.status && filter.status !== 'all') {
    list = list.filter((c) => contractState(c) === filter.status);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.contractNo.toLowerCase().includes(q) ||
        c.partyB.toLowerCase().includes(q) ||
        (c.employeeName || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getContract(id: string): Contract | undefined {
  return contracts.get(id);
}

export function createContract(
  data: Omit<Contract, 'id' | 'contractNo' | 'createdAt' | 'updatedAt'>
): Contract {
  const withStatus = computeStatus({ ...data, status: 'active' } as Contract);
  return addContract(withStatus);
}

export function modifyContract(id: string, patch: Partial<Contract>): Contract | null {
  const current = contracts.get(id);
  if (!current) return null;
  const merged = computeStatus({ ...current, ...patch });
  return updateContract(id, merged);
}

export function removeContract(id: string): boolean {
  return deleteContract(id);
}

export function contractSummary() {
  const all = Array.from(contracts.values()).map(enrichContract);
  const active = all.filter((c) => contractState(c) === 'active');
  const expiring = all.filter((c) => contractState(c) === 'expiring');
  const expired = all.filter((c) => contractState(c) === 'expired');
  const totalValue = active.reduce((s, c) => s + c.value, 0) + expiring.reduce((s, c) => s + c.value, 0);
  return { total: all.length, active: active.length, expiring: expiring.length, expired: expired.length, totalValue };
}

export function resolveEmployeeName(employeeId?: string): string | undefined {
  if (!employeeId) return undefined;
  const emp = employees.get(employeeId) as Employee | undefined;
  return emp?.fullName;
}

export function availableEmployees(): Array<Pick<Employee, 'id' | 'employeeId' | 'fullName'>> {
  return Array.from(employees.values()).map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    fullName: e.fullName,
  }));
}