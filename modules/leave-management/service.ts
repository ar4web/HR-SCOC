import { leaves, addLeave } from '@/lib/mock-data';
import { LeaveRequest, LeaveStatus } from '@/types';

export function getAllLeaves(): LeaveRequest[] {
  return Array.from(leaves.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createLeaveRequest(
  data: Omit<LeaveRequest, 'id' | 'daysCount' | 'status' | 'createdAt' | 'updatedAt'>
): LeaveRequest {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysCount = Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);

  return addLeave({
    ...data,
    companyId: data.companyId || 'demo-company',
    daysCount,
    status: 'pending',
    attachments: data.attachments || [],
  });
}

export function updateLeaveStatus(id: string, status: LeaveStatus): LeaveRequest | undefined {
  const leave = leaves.get(id);
  if (!leave) return undefined;
  leave.status = status;
  leave.updatedAt = new Date().toISOString();
  return leave;
}
