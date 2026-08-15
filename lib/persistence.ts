import { User, Company, Employee, LeaveRequest, Notification, Message, Channel, Announcement, AuditLog, Attendance, Payroll, Todo, HRDocument, EmailTemplate, EmailSettings, EmailOutbox, Expense, EmployeeLifecycle, Contract } from '@/types';

export type PersistedUser = User & { password?: string };

export interface PersistedState {
  version: number;
  users: PersistedUser[];
  companies: Company[];
  employees: Employee[];
  leaves: LeaveRequest[];
  notifications: Notification[];
  attendanceRecords: Attendance[];
  payrolls: Payroll[];
  messages: Message[];
  channels: Channel[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  todos: Todo[];
  documents: HRDocument[];
  emailTemplates: EmailTemplate[];
  emailOutbox: EmailOutbox[];
  emailSettings: EmailSettings;
  expenses: Expense[];
  lifecycles: EmployeeLifecycle[];
  contracts: Contract[];
}

interface FsLike {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string, enc: string) => string;
  writeFileSync: (p: string, data: string, enc: string) => void;
  renameSync: (a: string, b: string) => void;
  mkdirSync: (p: string, opts: { recursive: boolean }) => void;
}

// Lazy, server-only, eval-based requires so webpack never tries to bundle
// `fs` / `path` into client chunks (mock-data is reachable from client pages).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serverRequire<T = any>(mod: string): T | null {
  if (typeof process === 'undefined' || typeof window !== 'undefined') return null;
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require') as (id: string) => T;
    return req(mod);
  } catch {
    return null;
  }
}

function parse(raw: string): PersistedState | null {
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.users)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function resolvePaths(): { dataFile: string; backupFile: string; dataDir: string } | null {
  const fs = serverRequire<{ join: (...parts: string[]) => string }>('path');
  if (!fs?.join || typeof process === 'undefined') return null;
  try {
    const dataDir = fs.join(process.cwd(), 'data');
    return { dataDir, dataFile: fs.join(dataDir, 'db.json'), backupFile: fs.join(dataDir, 'db.backup.json') };
  } catch {
    return null;
  }
}

export function loadPersistedData(): PersistedState | null {
  const fs = serverRequire<FsLike>('fs');
  const paths = resolvePaths();
  if (!fs || !paths) return null;
  try {
    if (!fs.existsSync(paths.dataFile)) return null;
    const parsed = parse(fs.readFileSync(paths.dataFile, 'utf-8'));
    if (parsed) return parsed;
    if (fs.existsSync(paths.backupFile)) {
      return parse(fs.readFileSync(paths.backupFile, 'utf-8'));
    }
    return null;
  } catch {
    return null;
  }
}

export function savePersisted(state: PersistedState): void {
  const fs = serverRequire<FsLike>('fs');
  const paths = resolvePaths();
  if (!fs || !paths) return;
  try {
    if (!fs.existsSync(paths.dataDir)) fs.mkdirSync(paths.dataDir, { recursive: true });
    const tmp = `${paths.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf-8');
    fs.renameSync(tmp, paths.dataFile);
    fs.writeFileSync(paths.backupFile, JSON.stringify(state), 'utf-8');
  } catch (err) {
    console.error('[persistence] failed to save:', err);
  }
}