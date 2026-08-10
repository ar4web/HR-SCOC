import { api } from '@/lib/api';
import { employees, addEmployee, updateEmployee as updateEmployeeRecord } from '@/lib/mock-data';
import { Employee } from '@/types';

export function getAllEmployees(): Employee[] {
  return Array.from(employees.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getEmployeeById(id: string): Employee | undefined {
  return employees.get(id);
}

export function createEmployee(
  data: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>
): Employee {
  return addEmployee(data);
}

export function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt' | 'companyId'>>
): Employee | null {
  return updateEmployeeRecord(id, data);
}

export const employeeService = {
  list: (params?: { page?: number; pageSize?: number; search?: string; department?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.department) query.set('department', params.department);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return api.get<{ data: Employee[]; total: number }>(`/employees${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api.get<Employee>(`/employees/${id}`),

  getActive: () => api.get<{ data: Employee[]; total: number }>('/employees?status=active'),

  create: (data: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>) =>
    api.post<Employee>('/employees', data),

  update: (id: string, data: Partial<Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt' | 'companyId'>>) =>
    api.put<Employee>(`/employees/${id}`, data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/employees/${id}`),
};
