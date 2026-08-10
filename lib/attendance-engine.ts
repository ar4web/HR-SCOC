import { Attendance, AttendanceStatus } from '@/types';
import { employees, companies, attendanceRecords, addAttendance, persistData } from '@/lib/mock-data';

function resolveEmployeeId(employeeId: string): string | null {
  if (employees.has(employeeId)) return employeeId;
  const linked = Array.from(employees.values()).find((e) => e.userId === employeeId);
  return linked ? linked.id : null;
}

function workingStart(): string {
  const company = companies.get('demo-company');
  return company?.settings?.workingHours?.start || '09:00';
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function mins(time: string): number {
  const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function getAttendance(date?: string, employeeId?: string) {
  let list = Array.from(attendanceRecords.values());
  if (date) list = list.filter((a) => a.date === date);
  if (employeeId) {
    const resolved = resolveEmployeeId(employeeId) || employeeId;
    list = list.filter((a) => a.employeeId === resolved);
  }
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function clockIn(
  employeeId: string,
  location?: { lat: number; lng: number } | null
): { success: boolean; record?: Attendance; error?: string } {
  const resolved = resolveEmployeeId(employeeId);
  if (!resolved) {
    return { success: false, error: 'Employee not found' };
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = Array.from(attendanceRecords.values()).find(
    (a) => a.employeeId === resolved && a.date === today
  );

  if (existing) {
    return { success: false, error: 'Already clocked in today' };
  }

  const now = new Date();
  const time = fmtTime(now);
  const start = mins(workingStart());
  const check = mins(time);
  const status: AttendanceStatus = check > start + 15 ? 'late' : 'present';

  const record = addAttendance({
    employeeId: resolved,
    companyId: 'demo-company',
    date: today,
    clockIn: time,
    status,
    location: location || null,
  });

  return { success: true, record };
}

export function clockOut(employeeId: string): { success: boolean; record?: Attendance; error?: string } {
  const resolved = resolveEmployeeId(employeeId);
  if (!resolved) {
    return { success: false, error: 'Employee not found' };
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = Array.from(attendanceRecords.values()).find(
    (a) => a.employeeId === resolved && a.date === today
  );

  if (!existing) {
    return { success: false, error: 'No clock-in record found for today' };
  }

  if (existing.clockOut) {
    return { success: false, error: 'Already clocked out today' };
  }

  const now = new Date();
  existing.clockOut = fmtTime(now);

  const total = mins(existing.clockOut) - mins(existing.clockIn);
  const breakTime = total > 4 * 60 ? 60 : 0;
  existing.hoursWorked = Math.max(0, Math.round(((total - breakTime) * 100) / 60) / 100);

  persistData();
  return { success: true, record: existing };
}
