import { users, auditLogs, addAuditLog as createAuditLog, addUser as createUser, updateUser, deleteUser } from '@/lib/mock-data';
import { User, UserRole, AuditLog } from '@/types';

export type { AuditLog };

export function getUsers(): (User & { password?: string })[] {
  return Array.from(users.values()).map(({ password, ...u }) => u);
}

export function getAuditLogs(): AuditLog[] {
  return Array.from(auditLogs.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const addAuditLog = createAuditLog;

export function recordLogin(userId: string, userName: string) {
  return createAuditLog(userId, userName, 'Login', `${userName} logged in`);
}

export interface CreateUserInput {
  email: string;
  name: string;
  nameAr?: string;
  role: UserRole;
  language: 'en' | 'ar';
  password?: string;
}

export function addUserToCompany(input: CreateUserInput): { user?: User; error?: string } {
  if (!input.email || !input.name) {
    return { error: 'Email and name are required' };
  }
  const email = input.email.trim().toLowerCase();
  if (Array.from(users.values()).some((u) => u.email.toLowerCase() === email)) {
    return { error: 'A user with this email already exists' };
  }
  const user = createUser({
    email,
    name: input.name.trim(),
    nameAr: input.nameAr?.trim(),
    role: input.role,
    language: input.language,
    companyId: 'demo-company',
    password: input.password || 'Password123!',
  });
  return { user };
}

export function updateUserRole(userId: string, role: UserRole): { user?: User; error?: string } {
  const user = updateUser(userId, { role });
  if (!user) return { error: 'User not found' };
  return { user };
}

export function updateUserProfile(userId: string, updates: { name?: string; nameAr?: string; language?: 'en' | 'ar'; role?: UserRole }): { user?: User; error?: string } {
  const user = updateUser(userId, updates);
  if (!user) return { error: 'User not found' };
  return { user };
}

export function removeUser(userId: string): { success: boolean; error?: string } {
  const removed = deleteUser(userId);
  if (!removed) return { success: false, error: 'User not found' };
  return { success: true };
}
