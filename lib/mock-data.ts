import {
  User,
  Company,
  Employee,
  LeaveRequest,
  ModuleDefinition,
  Notification,
  Message,
  Channel,
  Announcement,
  AuditLog,
  Attendance,
  Payroll,
  Department,
  CompanySettings,
  Branding,
  Todo,
  HRDocument,
  EmailTemplate,
  EmailSettings,
  EmailOutbox,
  EmployeeLifecycle,
  Expense,
  ExpenseCategory,
  MessageAttachment,
  Contract,
  ManualReminder,
  ZatcaInvoice,
  ZatcaSettings,
  DocPrinterAssets,
} from '@/types';
import { generateId, formatEmployeeId } from './utils';
import { loadPersistedData, savePersisted, PersistedState } from './persistence';
import { demoIdCardImage, demoPdf, demoTextFile } from './demo-files';
import { hashPassword, shouldRehash } from './passwords';

let persistenceEnabled = false;

function persist(): void {
  if (!persistenceEnabled) return;
  const state: PersistedState = {
    version: 1,
    users: Array.from(users.values()).map((u) => ({ ...u })),
    companies: Array.from(companies.values()),
    employees: Array.from(employees.values()),
    leaves: Array.from(leaves.values()),
    notifications: Array.from(notifications.values()),
    attendanceRecords: Array.from(attendanceRecords.values()),
    payrolls: Array.from(payrolls.values()),
    messages: Array.from(messages.values()),
    channels: Array.from(channels.values()),
    announcements: Array.from(announcements.values()),
    auditLogs: Array.from(auditLogs.values()),
    todos: Array.from(todos.values()),
    documents: Array.from(documents.values()),
    emailTemplates: Array.from(emailTemplates.values()),
    emailOutbox: Array.from(emailOutbox.values()),
    emailSettings: { ...emailSettings },
    expenses: Array.from(expenses.values()),
    lifecycles: Array.from(lifecycles.values()),
    contracts: Array.from(contracts.values()),
    manualReminders: [...manualReminders],
    zatcaInvoices: Array.from(zatcaInvoiceStore.values()),
    zatcaSettings: { ...zatcaSettingsStore },
    docPrinterAssets: { ...docPrinterAssetsStore },
  };
  savePersisted(state);
}

/**
 * Persist current in-memory state to disk. Safe to call from route handlers
 * that mutate maps directly.
 */
export function persistData(): void {
  persist();
}

const demoCompany: Company = {
  id: 'demo-company',
  name: 'Saudi Corporation',
  nameAr: 'الشركة السعودية',
  taxNumber: '3101234567',
  industry: 'Technology',
  employeeCount: 0,
  establishedDate: '2020-01-01',
  settings: {
    workWeek: { startDay: 0, endDay: 4, hoursPerDay: 8, daysPerWeek: 5 },
    weekendDays: [5, 6],
    holidays: (() => {
      const year = new Date().getFullYear();
      return [
        { id: 'h1', name: 'Saudi National Day', nameAr: 'اليوم الوطني السعودي', date: `${year}-09-23`, isRecurring: true },
        { id: 'h2', name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', date: `${year}-03-21`, isRecurring: false },
        { id: 'h3', name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', date: `${year}-05-27`, isRecurring: false },
        { id: 'h4', name: 'Saudi Founding Day', nameAr: 'يوم التأسيس السعودي', date: `${year}-02-22`, isRecurring: true },
        { id: 'h5', name: 'National Flag Day', nameAr: 'يوم العلم', date: `${year}-03-11`, isRecurring: true },
      ];
    })(),
    leavePolicies: [
      { type: 'annual', daysPerYear: 30, carryoverDays: 15, requiresApproval: true, paid: true },
      { type: 'sick', daysPerYear: 30, carryoverDays: 0, requiresApproval: true, paid: true },
      { type: 'personal', daysPerYear: 10, carryoverDays: 0, requiresApproval: true, paid: true },
      { type: 'emergency', daysPerYear: 5, carryoverDays: 0, requiresApproval: false, paid: true },
      { type: 'maternity', daysPerYear: 98, carryoverDays: 0, requiresApproval: false, paid: true },
      { type: 'paternity', daysPerYear: 3, carryoverDays: 0, requiresApproval: false, paid: true },
      { type: 'hajj', daysPerYear: 10, carryoverDays: 0, requiresApproval: true, paid: true },
      { type: 'unpaid', daysPerYear: 30, carryoverDays: 0, requiresApproval: true, paid: false },
    ],
    workingHours: { start: '09:00', end: '18:00' },
    overtimeRate: 1.5,
    gosiEnabled: true,
    wpsEnabled: true,
  },
  branding: {
    // Atlas Navy — the app's default corporate palette (matches :root CSS).
    primaryColor: '#1b3a5f',
    secondaryColor: '#0c1c30',
    accentColor: '#c4a35a',
    theme: 'light',
  },
  moduleStates: {
    'employee-management': true,
    'leave-management': true,
    'payroll': true,
    'attendance': true,
    'communication': true,
    'todo-management': true,
    'document-management': true,
    'email': true,
    'expense-management': true,
    'reports': true,
    'administration': true,
    'contracts': false,
  },
  createdAt: '2020-01-01',
  updatedAt: '2024-01-01',
};

const demoAdmin: User = {
  id: 'user-1',
  email: 'admin@scos.sa',
  name: 'Admin User',
  nameAr: 'المدير',
  role: 'admin',
  companyId: 'demo-company',
  language: 'en',
};

const demoEmployee: User = {
  id: 'user-2',
  email: 'employee@scos.sa',
  name: 'Employee User',
  nameAr: 'موظف',
  role: 'employee',
  companyId: 'demo-company',
  language: 'en',
};

export let users: Map<string, User & { password: string }> = new Map([
  ['user-1', { ...demoAdmin, password: 'Password123!' }],
  ['user-2', { ...demoEmployee, password: 'Password123!' }],
]);

export let companies: Map<string, Company> = new Map([
  ['demo-company', demoCompany],
]);

export let employees: Map<string, Employee> = new Map();
let employeeCounter = 0;

export let leaves: Map<string, LeaveRequest> = new Map();

export let notifications: Map<string, Notification> = new Map();

export let attendanceRecords: Map<string, Attendance> = new Map();

export let payrolls: Map<string, Payroll> = new Map();

export let messages: Map<string, Message> = new Map();

export let channels: Map<string, Channel> = new Map();

export let announcements: Map<string, Announcement> = new Map();

export let auditLogs: Map<string, AuditLog> = new Map();

export let todos: Map<string, Todo> = new Map();

export let documents: Map<string, HRDocument> = new Map();

export let emailTemplates: Map<string, EmailTemplate> = new Map();
export let emailOutbox: Map<string, EmailOutbox> = new Map();

export let expenses: Map<string, Expense> = new Map();

export let lifecycles: Map<string, EmployeeLifecycle> = new Map();

export let contracts: Map<string, Contract> = new Map();
export let contractCounter = 0;

export let manualReminders: ManualReminder[] = [];

/* ---------------- ZATCA e-invoicing store ---------------- */

export const DEFAULT_ZATCA_SETTINGS: ZatcaSettings = {
  sellerName: 'Saudi Corporation',
  sellerNameAr: 'الشركة السعودية',
  vatNumber: '310123456700003',
  crNumber: '1010-456789',
  address: 'King Fahd Road',
  addressAr: 'طريق الملك فهد',
  city: 'Riyadh',
  postalCode: '12345',
  buildingNumber: '7235',
  district: 'Al Olaya',
  invoicePrefix: 'INV',
  defaultVatRate: 15,
  defaultPaymentTerms: 'Net 30',
};

let zatcaInvoiceStore: Map<string, ZatcaInvoice> = new Map();
let zatcaSettingsStore: ZatcaSettings = { ...DEFAULT_ZATCA_SETTINGS };

export function zatcaInvoices(): Map<string, ZatcaInvoice> {
  return zatcaInvoiceStore;
}

export function zatcaSettings(): ZatcaSettings {
  return { ...zatcaSettingsStore };
}

export function saveZatcaSettings(settings: ZatcaSettings): void {
  zatcaSettingsStore = { ...settings };
  persist();
}

export function addZatcaInvoice(inv: ZatcaInvoice): void {
  zatcaInvoiceStore.set(inv.id, inv);
  persist();
}

/** Pass null to just trigger a persist (e.g. after a raw map delete). */
export function updateZatcaInvoice(inv: ZatcaInvoice | null): void {
  if (inv) zatcaInvoiceStore.set(inv.id, inv);
  persist();
}

/* ---------------- Doc Printer assets store ---------------- */

let docPrinterAssetsStore: DocPrinterAssets = {};

export function docPrinterAssets(): DocPrinterAssets {
  return { ...docPrinterAssetsStore };
}

export function saveDocPrinterAssets(patch: Partial<DocPrinterAssets>): DocPrinterAssets {
  docPrinterAssetsStore = { ...docPrinterAssetsStore, ...patch };
  persist();
  return { ...docPrinterAssetsStore };
}

export function addManualReminder(data: { name: string; nameAr?: string; dueDate: string }): ManualReminder {
  const reminder: ManualReminder = { id: generateId(), name: data.name, nameAr: data.nameAr, dueDate: data.dueDate };
  manualReminders.push(reminder);
  persist();
  return reminder;
}

export let departments: Department[] = [
  { id: 'dept-1', name: 'Engineering', nameAr: 'الهندسة', employeeCount: 0 },
  { id: 'dept-2', name: 'Marketing', nameAr: 'التسويق', employeeCount: 0 },
  { id: 'dept-3', name: 'Finance', nameAr: 'المالية', employeeCount: 0 },
  { id: 'dept-4', name: 'HR', nameAr: 'الموارد البشرية', employeeCount: 0 },
  { id: 'dept-5', name: 'Operations', nameAr: 'العمليات', employeeCount: 0 },
  { id: 'dept-6', name: 'Sales', nameAr: 'المبيعات', employeeCount: 0 },
];

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: 'employee-management',
    name: 'Employee Management',
    nameAr: 'إدارة الموظفين',
    description: 'Manage employee records, contracts, and documents',
    descriptionAr: 'إدارة سجلات الموظفين والعقود والمستندات',
    icon: 'Users',
    dependencies: [],
    enabled: true,
    route: '/employees',
  },
  {
    id: 'leave-management',
    name: 'Leave Management',
    nameAr: 'إدارة الإجازات',
    description: 'Manage leave requests, approvals, and calendar',
    descriptionAr: 'إدارة طلبات الإجازات والموافقات والتقويم',
    icon: 'Calendar',
    dependencies: ['employee-management'],
    enabled: true,
    route: '/leaves',
  },
  {
    id: 'payroll',
    name: 'Payroll',
    nameAr: 'الرواتب',
    description: 'Process payroll, GOSI contributions, and WPS files',
    descriptionAr: 'معالجة الرواتب واشتراكات التأمينات الاجتماعية وملفات WPS',
    icon: 'DollarSign',
    dependencies: ['employee-management'],
    enabled: true,
    route: '/payroll',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    nameAr: 'الحضور والانصراف',
    description: 'Track employee attendance and working hours',
    descriptionAr: 'تتبع حضور وانصراف الموظفين وساعات العمل',
    icon: 'Clock',
    dependencies: ['employee-management'],
    enabled: true,
    route: '/attendance',
  },
  {
    id: 'communication',
    name: 'Chat',
    nameAr: 'الدردشة',
    description: 'Team chat with messages, images, and file attachments',
    descriptionAr: 'دردشة الفريق مع الرسائل والصور ومرفقات الملفات',
    icon: 'MessageSquare',
    dependencies: [],
    enabled: true,
    route: '/communication',
  },
  {
    id: 'todo-management',
    name: 'Tasks & Reminders',
    nameAr: 'المهام والتذكيرات',
    description: 'Track tasks, deadlines, priorities and expiry reminders',
    descriptionAr: 'تتبع المهام والمواعيد والأولويات وتذكيرات الانتهاء',
    icon: 'ListTodo',
    dependencies: [],
    enabled: true,
    route: '/todos',
  },
  {
    id: 'document-management',
    name: 'Document Management',
    nameAr: 'إدارة المستندات',
    description: 'Store documents and track expiry with reminders',
    descriptionAr: 'تخزين المستندات وتتبع انتهاء الصلاحية مع التذكيرات',
    icon: 'FolderOpen',
    dependencies: [],
    enabled: true,
    route: '/documents',
  },
  {
    id: 'email',
    name: 'Email Center',
    nameAr: 'مركز البريد الإلكتروني',
    description: 'SMTP configuration and prebuilt email templates',
    descriptionAr: 'إعدادات SMTP وقوالب البريد الجاهزة',
    icon: 'Mail',
    dependencies: [],
    enabled: true,
    route: '/email',
  },
  {
    id: 'expense-management',
    name: 'Expense Management',
    nameAr: 'إدارة المصروفات',
    description: 'Daily expense records and reimbursement requests',
    descriptionAr: 'سجلات المصروفات اليومية وطلبات الاسترداد',
    icon: 'Receipt',
    dependencies: [],
    enabled: true,
    route: '/expenses',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    nameAr: 'التقارير والتحليلات',
    description: 'HR analytics and report generation',
    descriptionAr: 'تحليلات الموارد البشرية وإعداد التقارير',
    icon: 'BarChart',
    dependencies: ['employee-management', 'leave-management'],
    enabled: true,
    route: '/reports',
  },
  {
    id: 'administration',
    name: 'Administration',
    nameAr: 'الإدارة',
    description: 'User management, roles, and system settings',
    descriptionAr: 'إدارة المستخدمين والأدوار وإعدادات النظام',
    icon: 'Settings',
    dependencies: [],
    enabled: true,
    route: '/administration',
  },
  {
    id: 'contracts',
    name: 'Contracts & Agreements',
    nameAr: 'العقود والاتفاقيات',
    description: 'Employment contracts, service agreements and NDAs with automatic expiry tracking and renewal-window alerts',
    descriptionAr: 'عقود العمل واتفاقيات الخدمة واتفاقيات عدم الإفصاح مع تتبع انتهاء الصلاحية وتنبيهات التجديد',
    icon: 'FileText',
    dependencies: ['employee-management'],
    enabled: false,
    route: '/contracts',
  },
  {
    id: 'doc-printer',
    name: 'Doc Printer',
    nameAr: 'طابعة المستندات',
    description: 'Bilingual HR document generator — contracts, letters and certificates with logo & seal',
    descriptionAr: 'مولد مستندات الموارد البشرية ثنائي اللغة — عقود وخطابات وشهادات مع الشعار والختم',
    icon: 'FileSignature',
    dependencies: ['employee-management'],
    enabled: true,
    route: '/doc-printer',
  },
  {
    id: 'invoicing',
    name: 'ZATCA Invoicing',
    nameAr: 'الفوترة الإلكترونية',
    description: 'Saudi e-invoicing (Fatoora) — VAT invoices with ZATCA-compliant QR codes and hash chaining',
    descriptionAr: 'الفوترة الإلكترونية السعودية (فاتورة) — فواتير ضريبية برمز QR متوافق مع هيئة الزكاة والضريبة والجمارك',
    icon: 'ReceiptText',
    dependencies: [],
    enabled: true,
    route: '/invoicing',
  },
];

export function getCompany(): Company | undefined {
  return companies.get('demo-company');
}

export function updateCompany(updates: Partial<Company>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  Object.assign(company, updates, { updatedAt: new Date().toISOString() });
  persist();
  return company;
}

export function updateCompanySettings(settings: Partial<CompanySettings>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.settings = { ...company.settings, ...settings };
  company.updatedAt = new Date().toISOString();
  persist();
  return company;
}

export function updateCompanyBranding(branding: Branding): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.branding = branding;
  company.updatedAt = new Date().toISOString();
  persist();
  return company;
}

export function setModuleStates(states: Record<string, boolean>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.moduleStates = states;
  company.updatedAt = new Date().toISOString();
  persist();
  return company;
}

export function addUser(data: Omit<User, 'id'> & { password?: string }): User {
  const id = generateId();
  const user: User = {
    id,
    email: data.email,
    name: data.name,
    nameAr: data.nameAr,
    role: data.role,
    companyId: data.companyId,
    language: data.language,
    avatar: data.avatar,
  };
  users.set(id, { ...user, password: data.password ? hashPassword(data.password) : hashPassword('Password123!') });
  persist();
  return user;
}

export function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'nameAr' | 'role' | 'language' | 'avatar'>>): User | undefined {
  const existing = users.get(id);
  if (!existing) return undefined;
  const updated: User = { ...existing, ...updates };
  users.set(id, { ...updated, password: existing.password });
  persist();
  return updated;
}

export function deleteUser(id: string): boolean {
  const removed = users.delete(id);
  persist();
  return removed;
}

export function addEmployee(data: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>): Employee {  employeeCounter++;
  const total = data.salary.basic + data.salary.housing + data.salary.transportation + data.salary.otherAllowances;
  const employee: Employee = {
    ...data,
    id: generateId(),
    employeeId: formatEmployeeId(employeeCounter),
    salary: { ...data.salary, total },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  employees.set(employee.id, employee);
  const company = companies.get(data.companyId);
  if (company) {
    company.employeeCount = employees.size;
  }
  const dept = departments.find((d) => d.name === data.department);
  if (dept) dept.employeeCount += 1;
  persist();
  return employee;
}

export function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt' | 'companyId'>>
): Employee | null {
  const existing = employees.get(id);
  if (!existing) return null;
  const next: Employee = {
    ...existing,
    ...data,
    salary: data.salary ? { ...data.salary, total: data.salary.basic + data.salary.housing + data.salary.transportation + data.salary.otherAllowances } : existing.salary,
    updatedAt: new Date().toISOString(),
  };
  employees.set(id, next);
  persist();
  return next;
}

export function deleteEmployee(id: string): boolean {
  const removed = employees.delete(id);
  if (removed) {
    const company = companies.get('demo-company');
    if (company) company.employeeCount = employees.size;
  }
  persist();
  return removed;
}

export function deleteLeave(id: string): boolean {
  const removed = leaves.delete(id);
  persist();
  return removed;
}

export function addLeave(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): LeaveRequest {
  const leave: LeaveRequest = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leaves.set(leave.id, leave);
  persist();
  return leave;
}

export function addOutboundEmail(
  data: Omit<EmailOutbox, 'id' | 'createdAt' | 'status' | 'companyId'>
): EmailOutbox {
  const msg: EmailOutbox = {
    ...data,
    id: generateId(),
    companyId: 'demo-company',
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  emailOutbox.set(msg.id, msg);
  persist();
  return msg;
}

export function markOutboundEmail(id: string, status: 'sent' | 'failed'): boolean {
  const msg = emailOutbox.get(id);
  if (!msg) return false;
  msg.status = status;
  msg.sentAt = new Date().toISOString();
  persist();
  return true;
}

export function addLifecycle(
  data: Omit<EmployeeLifecycle, 'id' | 'createdAt' | 'updatedAt'>
): EmployeeLifecycle {
  const now = new Date().toISOString();
  const lifecycle: EmployeeLifecycle = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  lifecycles.set(lifecycle.id, lifecycle);
  persist();
  return lifecycle;
}

export function deleteLifecycle(id: string): boolean {
  const removed = lifecycles.delete(id);
  if (removed) persist();
  return removed;
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const n: Notification = {
    ...notification,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  notifications.set(n.id, n);
  persist();
  return n;
}

export function addAttendance(record: Omit<Attendance, 'id'>): Attendance {
  const r: Attendance = { ...record, id: generateId() };
  attendanceRecords.set(r.id, r);
  persist();
  return r;
}

export function addPayroll(record: Omit<Payroll, 'id'>): Payroll {
  const p: Payroll = { ...record, id: generateId() };
  payrolls.set(p.id, p);
  persist();
  return p;
}

export function addMessage(data: Omit<Message, 'id' | 'timestamp'>): Message {
  const m: Message = { ...data, id: generateId(), timestamp: new Date().toISOString() };
  messages.set(m.id, m);
  persist();
  return m;
}

export function editMessage(id: string, content: string): Message | null {
  const m = messages.get(id);
  if (!m || m.deletedAt) return null;
  const next: Message = { ...m, content, editedAt: new Date().toISOString() };
  messages.set(id, next);
  persist();
  return next;
}

export function deleteMessage(id: string): Message | null {
  const m = messages.get(id);
  if (!m || m.deletedAt) return null;
  const next: Message = { ...m, deletedAt: new Date().toISOString() };
  messages.set(id, next);
  persist();
  return next;
}

export function reactToMessage(id: string, userId: string, emoji: string): Message | null {
  const m = messages.get(id);
  if (!m || m.deletedAt) return null;
  const reactions = m.reactions ? m.reactions.map((r) => ({ ...r, userIds: [...r.userIds] })) : [];
  const idx = reactions.findIndex((r) => r.emoji === emoji);
  if (idx >= 0) {
    if (reactions[idx].userIds.includes(userId)) {
      reactions[idx].userIds = reactions[idx].userIds.filter((u) => u !== userId);
    } else {
      reactions[idx].userIds.push(userId);
    }
    if (reactions[idx].userIds.length === 0) reactions.splice(idx, 1);
  } else {
    reactions.push({ emoji, userIds: [userId] });
  }
  const next: Message = { ...m, reactions };
  messages.set(id, next);
  persist();
  return next;
}

export function addChannel(data: Omit<Channel, 'id' | 'createdAt'>): Channel {
  const c: Channel = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  channels.set(c.id, c);
  persist();
  return c;
}

export function addAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  const a: Announcement = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  announcements.set(a.id, a);
  persist();
  return a;
}

export function addTodo(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo {
  const now = new Date().toISOString();
  const t: Todo = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  todos.set(t.id, t);
  persist();
  return t;
}

export function updateTodo(id: string, patch: Partial<Todo>): Todo | null {
  const t = todos.get(id);
  if (!t) return null;
  const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
  todos.set(id, next);
  persist();
  return next;
}

export function deleteTodo(id: string): boolean {
  const removed = todos.delete(id);
  persist();
  return removed;
}

export function addDocument(data: Omit<HRDocument, 'id' | 'createdAt' | 'updatedAt'>): HRDocument {
  const now = new Date().toISOString();
  const d: HRDocument = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  documents.set(d.id, d);
  persist();
  return d;
}

export function updateDocument(id: string, patch: Partial<HRDocument>): HRDocument | null {
  const d = documents.get(id);
  if (!d) return null;
  const next = { ...d, ...patch, updatedAt: new Date().toISOString() };
  documents.set(id, next);
  persist();
  return next;
}

export function deleteDocument(id: string): boolean {
  const removed = documents.delete(id);
  persist();
  return removed;
}

export function addEmailTemplate(data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): EmailTemplate {
  const now = new Date().toISOString();
  const t: EmailTemplate = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  emailTemplates.set(t.id, t);
  persist();
  return t;
}

export function updateEmailTemplate(id: string, patch: Partial<EmailTemplate>): EmailTemplate | null {
  const t = emailTemplates.get(id);
  if (!t) return null;
  const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
  emailTemplates.set(id, next);
  persist();
  return next;
}

export function deleteEmailTemplate(id: string): boolean {
  const removed = emailTemplates.delete(id);
  persist();
  return removed;
}

export function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
  const now = new Date().toISOString();
  const e: Expense = { ...data, id: generateId(), createdAt: now, updatedAt: now };
  expenses.set(e.id, e);
  persist();
  return e;
}

export function updateExpense(id: string, patch: Partial<Expense>): Expense | null {
  const e = expenses.get(id);
  if (!e) return null;
  const next = { ...e, ...patch, updatedAt: new Date().toISOString() };
  expenses.set(id, next);
  persist();
  return next;
}

export function deleteExpense(id: string): boolean {
  const removed = expenses.delete(id);
  persist();
  return removed;
}

export function nextContractNo(): string {
  contractCounter += 1;
  return `CTR-${String(contractCounter).padStart(4, '0')}`;
}

export function addContract(data: Omit<Contract, 'id' | 'contractNo' | 'createdAt' | 'updatedAt'>): Contract {
  const now = new Date().toISOString();
  const c: Contract = {
    ...data,
    id: generateId(),
    contractNo: nextContractNo(),
    createdAt: now,
    updatedAt: now,
  };
  contracts.set(c.id, c);
  persist();
  return c;
}

export function updateContract(id: string, patch: Partial<Contract>): Contract | null {
  const c = contracts.get(id);
  if (!c) return null;
  const next = { ...c, ...patch, updatedAt: new Date().toISOString() };
  contracts.set(id, next);
  persist();
  return next;
}

export function deleteContract(id: string): boolean {
  const removed = contracts.delete(id);
  persist();
  return removed;
}

export let emailSettings: EmailSettings = {
  provider: 'smtp',
  fromName: 'SCOS HR',
  fromEmail: 'hr@scos.sa',
  replyTo: 'no-reply@scos.sa',
  smtpHost: 'smtp.scos.sa',
  smtpPort: 587,
  smtpUser: 'hr@scos.sa',
  smtpPassword: '',
  encryption: 'tls',
  enabled: true,
  updatedAt: new Date().toISOString(),
};

export function updateEmailSettings(patch: Partial<EmailSettings>): EmailSettings {
  emailSettings = { ...emailSettings, ...patch, updatedAt: new Date().toISOString() };
  persist();
  return emailSettings;
}

export const expenseCategories: ExpenseCategory[] = [
  { id: 'ec-1', name: 'Office Supplies', nameAr: 'لوازم مكتبية' },
  { id: 'ec-2', name: 'Travel', nameAr: 'سفر' },
  { id: 'ec-3', name: 'Transportation', nameAr: 'مواصلات' },
  { id: 'ec-4', name: 'Meals', nameAr: 'وجبات' },
  { id: 'ec-5', name: 'Accommodation', nameAr: 'إقامة' },
  { id: 'ec-6', name: 'Technology', nameAr: 'تقنية' },
  { id: 'ec-7', name: 'Fuel', nameAr: 'وقود' },
  { id: 'ec-8', name: 'Utilities', nameAr: 'مرافق عامة' },
  { id: 'ec-9', name: 'Marketing', nameAr: 'تسويق' },
  { id: 'ec-10', name: 'Training', nameAr: 'تدريب' },
  { id: 'ec-11', name: 'Maintenance', nameAr: 'صيانة' },
  { id: 'ec-12', name: 'Entertainment', nameAr: 'ترفيه' },
  { id: 'ec-13', name: 'Medical', nameAr: 'علاج طبي' },
  { id: 'ec-14', name: 'Other', nameAr: 'أخرى' },
];

export function addAuditLog(userId: string, userName: string, action: string, details: string): AuditLog {
  const log: AuditLog = {
    id: generateId(),
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  auditLogs.set(log.id, log);
  return log;
}

function seedDemoData() {
  if (employees.size > 0) return;

const demoEmployees: {
    fullName: string; fullNameAr: string; email: string; phone: string; nationalId: string; nationality?: string; iqamaNumber?: string; gender: 'male' | 'female'; maritalStatus: 'married' | 'single' | 'divorced' | 'widowed'; dateOfBirth: string; hireDate: string; department: string; position: string; contractType: 'permanent' | 'fixed_term' | 'probation' | 'part_time'; basic: number; housing: number; transport: number; managerId?: string; sponsorName?: string; sponsorId?: string; contractEndDate?: string; workPermitExpiry?: string; iqamaExpiryDate?: string; bankName: string; bankAccount: string;
  }[] = [
    { fullName: 'Ahmed Al-Saud', fullNameAr: 'أحمد آل سعود', email: 'ahmed@scos.sa', phone: '+966501234561', nationalId: '1012345678', nationality: 'Saudi', iqamaNumber: undefined, gender: 'male' as const, maritalStatus: 'married' as const, dateOfBirth: '1985-03-14', hireDate: '2020-01-15', department: 'Engineering', position: 'Senior Manager', contractType: 'permanent' as const, basic: 25000, housing: 10000, transport: 3000, managerId: undefined, sponsorName: undefined, sponsorId: undefined, contractEndDate: undefined, workPermitExpiry: undefined, iqamaExpiryDate: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567890' },
    { fullName: 'Sara Al-Qahtani', fullNameAr: 'سارة القحطاني', email: 'sara@scos.sa', phone: '+966501234562', nationalId: '1023456789', nationality: 'Sudanese', iqamaNumber: '2144455667', sponsorName: 'Saudi Solutions Co.', sponsorId: 'SS-2024-001', contractEndDate: '2026-12-31', workPermitExpiry: '2026-10-20', iqamaExpiryDate: '2026-11-20', gender: 'female' as const, maritalStatus: 'single' as const, dateOfBirth: '1991-07-22', hireDate: '2021-03-01', department: 'Marketing', position: 'Marketing Manager', contractType: 'permanent' as const, basic: 20000, housing: 8000, transport: 2500, managerId: undefined, bankName: 'Riyad Bank', bankAccount: 'SA0123456789001234567891' },
    { fullName: 'Mohammed Asad', fullNameAr: 'محمد أسعد', email: 'mohammed@scos.sa', phone: '+966501234563', nationalId: '1034567890', nationality: 'Pakistani', iqamaNumber: '2123456789', sponsorName: 'Zamil Manpower Services', sponsorId: 'ZMS-889', contractEndDate: '2027-03-31', workPermitExpiry: '2026-09-30', iqamaExpiryDate: '2026-10-30', gender: 'male' as const, maritalStatus: 'single' as const, dateOfBirth: '1993-11-05', hireDate: '2022-06-01', department: 'Finance', position: 'Financial Analyst', contractType: 'fixed_term' as const, basic: 15000, housing: 6000, transport: 2000, managerId: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567892' },
    { fullName: 'Nora Al-Harbi', fullNameAr: 'نورة الحربي', email: 'nora@scos.sa', phone: '+966501234564', nationalId: '1045678901', nationality: 'Saudi', iqamaNumber: undefined, sponsorName: undefined, sponsorId: undefined, contractEndDate: undefined, workPermitExpiry: undefined, iqamaExpiryDate: undefined, gender: 'female' as const, maritalStatus: 'married' as const, dateOfBirth: '1988-09-30', hireDate: '2021-01-10', department: 'HR', position: 'HR Specialist', contractType: 'permanent' as const, basic: 14000, housing: 5000, transport: 2000, managerId: undefined, bankName: 'Saudi British Bank', bankAccount: 'SA0123456789001234567893' },
    { fullName: 'Fahad Al-Dosari', fullNameAr: 'فهد الدوسري', email: 'fahad@scos.sa', phone: '+966501234565', nationalId: '1056789012', gender: 'male' as const, maritalStatus: 'single' as const, dateOfBirth: '1996-02-18', hireDate: '2023-09-01', department: 'Operations', position: 'Operations Coordinator', contractType: 'probation' as const, basic: 10000, housing: 4000, transport: 1500, managerId: undefined, bankName: 'Alinma Bank', bankAccount: 'SA0123456789001234567894' },
    { fullName: 'Lama Al-Shammari', fullNameAr: 'لمى الشمري', email: 'lama@scos.sa', phone: '+966501234566', nationalId: '1067890123', gender: 'female' as const, maritalStatus: 'single' as const, dateOfBirth: '1994-05-12', hireDate: '2022-02-14', department: 'Sales', position: 'Sales Executive', contractType: 'permanent' as const, basic: 12000, housing: 5000, transport: 2000, managerId: undefined, bankName: 'Bank Albilad', bankAccount: 'SA0123456789001234567895' },
    { fullName: 'Khalid Al-Ghamdi', fullNameAr: 'خالد الغامدي', email: 'khalid@scos.sa', phone: '+966501234567', nationalId: '1078901234', nationality: 'Egyptian', iqamaNumber: '2234567890', sponsorName: 'Saudi Solutions Co.', sponsorId: 'SS-2024-001', contractEndDate: '2027-12-31', workPermitExpiry: '2026-12-15', iqamaExpiryDate: '2027-01-15', gender: 'male' as const, maritalStatus: 'married' as const, dateOfBirth: '1990-01-25', hireDate: '2020-05-20', department: 'Engineering', position: 'Software Engineer', contractType: 'fixed_term' as const, basic: 18000, housing: 7000, transport: 2500, managerId: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567896' },
    { fullName: 'Hessa Al-Zahrani', fullNameAr: 'حصه الزهراني', email: 'hessa@scos.sa', phone: '+966501234568', nationalId: '1089012345', gender: 'female' as const, maritalStatus: 'single' as const, dateOfBirth: '1997-08-08', hireDate: '2023-01-05', department: 'Marketing', position: 'Content Specialist', contractType: 'permanent' as const, basic: 11000, housing: 4000, transport: 1500, managerId: undefined, bankName: 'Riyad Bank', bankAccount: 'SA0123456789001234567897' },
  ];

    for (const emp of demoEmployees) {
    const created = addEmployee({
      companyId: 'demo-company',
      fullName: emp.fullName,
      fullNameAr: emp.fullNameAr,
      email: emp.email,
      phone: emp.phone,
      nationalId: emp.nationalId,
      nationality: emp.nationality || 'Saudi',
      religion: 'muslim',
      gender: emp.gender,
      maritalStatus: emp.maritalStatus,
      dateOfBirth: emp.dateOfBirth,
      hireDate: emp.hireDate,
      contractType: emp.contractType,
      contractEndDate: emp.contractEndDate,
      iqamaNumber: emp.iqamaNumber,
      department: emp.department,
      position: emp.position,
      managerId: emp.managerId,
      salary: {
        basic: emp.basic,
        housing: emp.housing,
        transportation: emp.transport,
        otherAllowances: 0,
        total: emp.basic + emp.housing + emp.transport,
        bankName: emp.bankName,
        bankAccount: emp.bankAccount,
        iban: emp.bankAccount,
      },
      address: { street: 'King Fahd Road', city: 'Riyadh', region: 'Riyadh', postalCode: '12345', country: 'Saudi Arabia' },
      emergencyContact: { name: 'Family Member', relation: 'Spouse', phone: '+966501234569' },
      status: 'active',
      documents: [],
      sponsorName: emp.sponsorName !== undefined ? emp.sponsorName : emp.contractType === 'fixed_term' ? 'Saudi Solutions Co.' : undefined,
      sponsorId: emp.sponsorId !== undefined ? emp.sponsorId : emp.contractType === 'fixed_term' ? 'SS-2024-001' : undefined,
      annualVacationDays: emp.contractType === 'permanent' ? 30 : 21,
      vacationBalance: Math.floor(Math.random() * 20) + 5,
      endOfServiceAllowance: emp.basic * 0.5,
      probationEndDate: emp.contractType === 'probation' ? '2026-03-01' : undefined,
      workPermitExpiry: emp.workPermitExpiry !== undefined ? emp.workPermitExpiry : emp.contractType === 'fixed_term' ? '2027-06-30' : undefined,
      iqamaExpiryDate: emp.iqamaExpiryDate !== undefined ? emp.iqamaExpiryDate : emp.iqamaNumber ? '2027-06-30' : undefined,
    });
    void created;
  }

  const seeded = Array.from(employees.values());
  if (seeded[0]) seeded[0].userId = 'user-1';
  if (seeded[1]) seeded[1].userId = 'user-2';

  const empEntries = Array.from(employees.values());

  const dayAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };
  const dayAhead = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  empEntries.forEach((emp, i) => {
    for (let back = 0; back <= 7; back++) {
      if (back > 0 && back % 6 === 0) continue;
      const seed = i * 7 + back;
      const date = dayAgo(back);
      let status: Attendance['status'] = 'present';
      if (seed % 11 === 0) status = 'late';
      else if (seed % 13 === 0) status = 'absent';
      else if (seed % 17 === 0) status = 'half_day';
      const worked = status !== 'absent';
      const start = status === 'late' ? (8 + (seed % 2)) * 100 + 30 + (seed % 20) : 8 * 100 + (seed % 45);
      const clockIn = `${String(Math.floor(start / 100)).padStart(2, '0')}:${String(start % 100).padStart(2, '0')}`;
      const out = worked ? `${String(16 + (seed % 2)).padStart(2, '0')}:${String((i % 3) * 15 + 5)}` : undefined;
      addAttendance({
        employeeId: emp.id,
        companyId: 'demo-company',
        date,
        clockIn: worked ? clockIn : '',
        clockOut: back === 0 ? undefined : out,
        status,
      });
    }
  });

  if (empEntries.length >= 2) {
    addLeave({
      employeeId: empEntries[0].id,
      companyId: 'demo-company',
      type: 'annual',
      startDate: dayAgo(6),
      endDate: dayAgo(2),
      daysCount: 5,
      reason: 'Family vacation',
      status: 'approved',
      approvedBy: 'user-1',
      approvedAt: dayAgo(10),
      attachments: [],
    });
    const sara = empEntries[1];
    addLeave({
      employeeId: sara.id,
      companyId: 'demo-company',
      type: 'sick',
      startDate: dayAhead(2),
      endDate: dayAhead(2),
      daysCount: 1,
      reason: 'Medical appointment',
      status: 'pending',
      attachments: [],
    });
  }
  if (empEntries.length >= 3) {
    addLeave({
      employeeId: empEntries[2].id,
      companyId: 'demo-company',
      type: 'annual',
      startDate: dayAhead(1),
      endDate: dayAhead(3),
      daysCount: 3,
      reason: 'Personal trip',
      status: 'pending',
      attachments: [],
    });
    addLeave({
      employeeId: empEntries[2].id,
      companyId: 'demo-company',
      type: 'sick',
      startDate: dayAgo(12),
      endDate: dayAgo(11),
      daysCount: 2,
      reason: 'Flu recovery',
      status: 'approved',
      approvedBy: 'user-1',
      approvedAt: dayAgo(13),
      attachments: [],
    });
  }
  if (empEntries.length >= 4) {
    addLeave({
      employeeId: empEntries[3].id,
      companyId: 'demo-company',
      type: 'annual',
      startDate: dayAgo(3),
      endDate: dayAgo(1),
      daysCount: 3,
      reason: 'Hajj leave',
      status: 'rejected',
      approvedBy: 'user-1',
      approvedAt: dayAgo(4),
      attachments: [],
    });
    const sara = empEntries[1];
    if (sara) {
      addLeave({
        employeeId: sara.id,
        companyId: 'demo-company',
        type: 'annual',
        startDate: dayAhead(9),
        endDate: dayAhead(13),
        daysCount: 5,
        reason: 'Summer vacation',
        status: 'pending',
        attachments: [],
      });
    }
  }

  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'Welcome to SCOS', titleAr: 'مرحباً بك في SCOS', message: 'Your account has been created successfully.', messageAr: 'تم إنشاء حسابك بنجاح.', type: 'success', read: false, link: '/' });
  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'New Leave Request', titleAr: 'طلب إجازة جديد', message: 'Sara Al-Qahtani has submitted a sick leave request.', messageAr: 'قامت سارة القحطاني بتقديم طلب إجازة مرضية.', type: 'info', read: false, link: '/leaves' });
  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'Payroll Complete', titleAr: 'اكتمال معالجة الرواتب', message: 'July payroll has been processed successfully.', messageAr: 'تمت معالجة رواتب يوليو بنجاح.', type: 'success', read: false, link: '/payroll' });

  addMessage({ senderId: 'user-1', senderName: 'System', content: 'Welcome to the SCOS Communication Center!' });
    addAnnouncement({ title: 'Company Holiday Update', titleAr: 'تحديث الإجازة الرسمية', content: 'The company will observe the upcoming Saudi National Day as an official holiday.', contentAr: 'ستحتفل الشركة باليوم الوطني السعودي القادم كإجازة رسمية.', author: 'HR Department', priority: 'high' });
  addAnnouncement({ title: 'New Office Policy', titleAr: 'سياسة المكتب الجديدة', content: 'Please review the updated remote-work policy in the document portal.', contentAr: 'يرجى مراجعة سياسة العمل عن بُعد المحدثة في بوابة المستندات.', author: 'Administration', priority: 'normal' });

  const minutesAgo = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - mins);
    return d.toISOString();
  };
  const seedMsg = (proc: { senderId: string; senderName: string; content: string; recipientId?: string; attachment?: MessageAttachment; at: string }) => {
    const m = addMessage({ senderId: proc.senderId, senderName: proc.senderName, content: proc.content, attachment: proc.attachment, recipientId: proc.recipientId });
    messages.set(m.id, { ...m, timestamp: proc.at });
  };
  const contactId = (fullName: string) => Array.from(employees.values()).find((e) => e.fullName === fullName)?.id;

  const sampleImage = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#009B77"/><text x="240" y="150" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle">SCOS Office Event</text></svg>'
  );

  const ahmed = contactId('Ahmed Al-Saud');
  const sarah = contactId('Sara Al-Qahtani');
  const mohammed = contactId('Mohammed Al-Otaibi');
  const nora = contactId('Nora Al-Harbi');

  if (ahmed) {
    seedMsg({ senderId: ahmed, senderName: 'Ahmed Al-Saud', content: 'Morning! Do you have the Q3 engineering report ready?', recipientId: 'user-1', at: minutesAgo(240) });
    seedMsg({ senderId: 'user-1', senderName: 'Admin User', content: 'Yes, it is done. I will share the final version today.', recipientId: ahmed, at: minutesAgo(230) });
    seedMsg({ senderId: ahmed, senderName: 'Ahmed Al-Saud', content: 'Great, thanks!', recipientId: 'user-1', at: minutesAgo(228) });
    if (sarah) seedMsg({ senderId: ahmed, senderName: 'Ahmed Al-Saud', content: 'Also please put the national day event photo on the board.', attachment: { type: 'image', name: 'national-day.jpg', url: sampleImage, size: 245000 }, recipientId: 'user-1', at: minutesAgo(20) });
  }
  if (sarah) {
    seedMsg({ senderId: sarah, senderName: 'Sara Al-Qahtani', content: 'Hi! I submitted my sick leave request, could you please approve it?', recipientId: 'user-1', at: minutesAgo(150) });
    seedMsg({ senderId: 'user-1', senderName: 'Admin User', content: 'Sure, I just reviewed it. Approved, get well soon!', recipientId: sarah, at: minutesAgo(140) });
    seedMsg({ senderId: sarah, senderName: 'Sara Al-Qahtani', content: 'Thank you so much! 🙏', recipientId: 'user-1', at: minutesAgo(138) });
  }
  if (mohammed) {
    seedMsg({ senderId: mohammed, senderName: 'Mohammed Al-Otaibi', content: 'The expense reimbursement for the Jeddah trip is still pending.', recipientId: 'user-1', at: minutesAgo(80) });
    seedMsg({ senderId: 'user-1', senderName: 'Admin User', content: 'Let me check it in the expenses module and approve it now.', recipientId: mohammed, at: minutesAgo(65) });
    seedMsg({ senderId: mohammed, senderName: 'Mohammed Al-Otaibi', content: 'Perfect, thank you!', recipientId: 'user-1', at: minutesAgo(62) });
  }
  if (nora) {
    seedMsg({ senderId: nora, senderName: 'Nora Al-Harbi', content: 'Reminder: two company documents expire this month. I sent renewal alerts.', recipientId: 'user-1', at: minutesAgo(30) });
    seedMsg({ senderId: 'user-1', senderName: 'Admin User', content: 'Got it, I will follow up with administration today.', recipientId: nora, at: minutesAgo(25) });
  }

  addMessage({ senderId: 'system', senderName: 'SCOCS Bot', content: 'Welcome to SCOS Chat! You can send messages, images and files.', recipientId: 'user-1' });

  const empUsers = Array.from(employees.values()).slice(0, 4);
  const channelMembers = ['user-1', 'user-2', ...empUsers.map((e) => e.userId || '').filter(Boolean)];
  addChannel({ name: 'general', description: 'Company-wide announcements and chit-chat', companyId: 'demo-company', memberIds: channelMembers, createdBy: 'user-1' });
  addChannel({ name: 'engineering', description: 'Team channel for the Engineering department', companyId: 'demo-company', memberIds: channelMembers, createdBy: 'user-1' });
  addChannel({ name: 'hr-updates', description: 'HR policy updates and reminders', companyId: 'demo-company', memberIds: channelMembers, createdBy: 'user-1' });

  const today = new Date();
  const daysFromNow = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  addTodo({ title: 'Review employee contracts for Q4 renewal', description: 'Audit all fixed-term contracts expiring next quarter and prepare renewal letters.', priority: 'high', status: 'completed', dueDate: daysFromNow(3), category: 'HR' });
  addTodo({ title: 'Submit GOSI monthly contributions', description: 'Upload the monthly GOSI payroll file for all active employees.', priority: 'high', status: 'completed', dueDate: daysFromNow(2), category: 'Payroll' });
  addTodo({ title: 'Prepare Saudi National Day celebration plan', description: 'Coordinate with marketing for the National Day office event.', priority: 'medium', status: 'completed', dueDate: daysFromNow(10), category: 'Events' });
  addTodo({ title: 'Update employee handbooks', description: 'Refresh the Arabic and English versions of the handbook.', priority: 'medium', status: 'completed', dueDate: daysFromNow(-5), category: 'HR' });
  addTodo({ title: 'Renew company vehicle insurance', description: 'Get quotes from three providers before the current policy lapses.', priority: 'low', status: 'completed', dueDate: daysFromNow(15), category: 'Administration' });
  addTodo({ title: 'Quarterly expense review', description: 'Review Q3 expenses and approve pending reimbursements.', priority: 'high', status: 'completed', dueDate: daysFromNow(7), category: 'Finance' });
  addTodo({ title: 'Prepare office workstation for new hire', description: 'Set up laptop, monitor and desk for the incoming marketing intern.', priority: 'medium', status: 'pending', dueDate: daysFromNow(4), category: 'IT', ownerId: 'user-1' });
  addTodo({ title: 'Book annual leave for December', description: 'Coordinate with team and submit leave request before cutoff.', priority: 'low', status: 'pending', dueDate: daysFromNow(20), category: 'Personal', ownerId: 'user-2' });

  addDocument({
    name: 'Company Commercial Registration',
    nameAr: 'السجل التجاري للشركة',
    category: 'license',
    description: 'Official CR certificate from the Ministry of Commerce.',
    fileName: 'commercial-registration.pdf',
    fileSize: 245000,
    mimeType: 'application/pdf',
    fileData: demoPdf('Commercial Registration Certificate', [
      'Ministry of Commerce - Kingdom of Saudi Arabia',
      '',
      'CR Number: 1010-456789',
      'Company: SCOS Corp for Information Technology',
      'Legal form: Limited Liability Company (LLC)',
      'Capital: SAR 5,000,000',
      'City: Riyadh',
      '',
      'This certificate confirms the registration of the company in the',
      'commercial register. Renewal is required before the expiry date.',
      '',
      'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
    ]),
    expiryDate: daysFromNow(200),
    remindDaysBefore: 30,
    owner: 'SCOS Corp',
    department: 'Legal',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });
  addDocument({
    name: 'Office Lease Contract',
    nameAr: 'عقد إيجار المكتب',
    category: 'real_estate',
    description: 'Riyadh office lease agreement with building management.',
    fileName: 'office-lease.pdf',
    fileSize: 890000,
    mimeType: 'application/pdf',
    fileData: demoPdf('Office Lease Agreement', [
      'Lessor: Riyadh Towers Real Estate Co.',
      'Lessee: SCOS Corp for Information Technology',
      '',
      'Premises: Floor 12, King Fahd Road, Riyadh',
      'Area: 850 sqm',
      'Annual rent: SAR 720,000 payable quarterly',
      'Term: 24 months, renewable by mutual agreement',
      '',
      'The lessee shall maintain the premises in good condition and',
      'return them at the end of the term in the same state.',
      '',
      'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
    ]),
    expiryDate: daysFromNow(12),
    remindDaysBefore: 30,
    owner: 'SCOS Corp',
    department: 'Administration',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });
  addDocument({
    name: 'Ahmed Iqama',
    nameAr: 'إقامة أحمد',
    category: 'id_iqama',
    description: 'Resident identity card for Ahmed Al-Saud.',
    fileName: 'ahmed-iqama.svg',
    fileSize: 120000,
    mimeType: 'image/svg+xml',
    fileData: demoIdCardImage({ name: 'Ahmed Al-Saud', nameAr: 'أحمد آل سعود', idNumber: '2345678901', expiry: daysFromNow(25), accent: '#0F766E' }),
    expiryDate: daysFromNow(25),
    remindDaysBefore: 30,
    owner: 'Ahmed Al-Saud',
    department: 'Engineering',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });
  addDocument({
    name: 'Sara Iqama',
    nameAr: 'إقامة سارة',
    category: 'id_iqama',
    description: 'Resident identity card for Sara Al-Qahtani.',
    fileName: 'sara-iqama.svg',
    fileSize: 118000,
    mimeType: 'image/svg+xml',
    fileData: demoIdCardImage({ name: 'Sara Al-Qahtani', nameAr: 'سارة القحطاني', idNumber: '2456789012', expiry: daysFromNow(40), accent: '#7C3AED' }),
    expiryDate: daysFromNow(40),
    remindDaysBefore: 30,
    owner: 'Sara Al-Qahtani',
    department: 'Marketing',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });
  addDocument({
    name: 'Company Health Insurance Policy',
    nameAr: 'وثيقة التأمين الصحي للشركة',
    category: 'insurance',
    description: 'Group medical insurance policy for all employees.',
    fileName: 'health-policy.pdf',
    fileSize: 540000,
    mimeType: 'application/pdf',
    fileData: demoPdf('Group Health Insurance Policy', [
      'Insurer: Bupa Arabia (demo)',
      'Policyholder: SCOS Corp for Information Technology',
      '',
      'Class: VIP for managers, Class A for staff',
      'Covered members: all active employees and dependents',
      'Network: comprehensive KSA network',
      'Annual limit: SAR 500,000 per member',
      '',
      'This policy has EXPIRED and must be renewed immediately to keep',
      'employee coverage active.',
      '',
      'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
    ]),
    expiryDate: daysFromNow(-4),
    remindDaysBefore: 30,
    owner: 'SCOS Corp',
    department: 'HR',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });
  addDocument({
    name: 'Data Security Policy',
    nameAr: 'سياسة أمن البيانات',
    category: 'other',
    description: 'Internal data security and confidentiality policy.',
    fileName: 'security-policy.txt',
    fileSize: 76000,
    mimeType: 'text/plain',
    fileData: demoTextFile('Data Security Policy', [
      '1. All employee data is classified as confidential.',
      '2. Access to HR systems requires unique credentials; sharing accounts is prohibited.',
      '3. Documents containing personal data must be stored in the HR document vault only.',
      '4. External sharing of employee records requires written HR approval.',
      '5. Report suspected data incidents to it-security@scos.sa within 24 hours.',
      '',
      'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
    ]),
    remindDaysBefore: 0,
    owner: 'SCOS Corp',
    department: 'IT',
    uploadedBy: 'user-1',
    uploadedAt: today.toISOString(),
  });

  const templateHelper = (category: EmailTemplate['category'], name: string, nameAr: string, subject: string, subjectAr: string, body: string, bodyAr: string, variables: string[]) =>
    addEmailTemplate({ category, name, nameAr, subject, subjectAr, body, bodyAr, variables, createdBy: 'user-1' });

  templateHelper(
    'welcome', 'Welcome Email', 'بريد الترحيب',
    'Welcome to {{company_name}}, {{first_name}}!', 'مرحباً بك في {{company_name}}، {{first_name}}!',
    'Dear {{first_name}},\n\nWelcome to {{company_name}}! We are excited to have you on board. Your employee ID is {{employee_id}}.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nمرحباً بك في {{company_name}}! يسعدنا انضمامك لفريقنا. رقم الموظف الخاص بك هو {{employee_id}}.\n\nمع أطيب التحيات،\n{{from_name}}',
    ['company_name', 'first_name', 'employee_id', 'from_name']
  );
  templateHelper(
    'leave_approved', 'Leave Approved', 'موافقة الإجازة',
    'Your leave request has been approved', 'تمت الموافقة على طلب إجازتك',
    'Dear {{first_name}},\n\nYour leave request from {{start_date}} to {{end_date}} ({{days}} days) has been approved.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nتمت الموافقة على طلب إجازتك من {{start_date}} إلى {{end_date}} ({{days}} يوم).\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'start_date', 'end_date', 'days', 'from_name']
  );
  templateHelper(
    'leave_rejected', 'Leave Rejected', 'رفض الإجازة',
    'Update on your leave request', 'تحديث بخصوص طلب إجازتك',
    'Dear {{first_name}},\n\nUnfortunately, your leave request from {{start_date}} to {{end_date}} could not be approved. Please contact HR for more details.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nللأسف، تعذرت الموافقة على طلب إجازتك من {{start_date}} إلى {{end_date}}. يرجى التواصل مع الموارد البشرية لمزيد من التفاصيل.\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'start_date', 'end_date', 'from_name']
  );
  templateHelper(
    'payroll', 'Payslip Notification', 'إشعار الراتب',
    'Your payslip for {{period}} is ready', 'قسيمة الراتب الخاصة بك لشهر {{period}} جاهزة',
    'Dear {{first_name}},\n\nYour payslip for {{period}} is now available. Net pay: {{net_pay}} ﷼.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nقسيمة الراتب الخاصة بك لشهر {{period}} متاحة الآن. صافي الراتب: {{net_pay}} ريال.\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'period', 'net_pay', 'from_name']
  );
  templateHelper(
    'expense', 'Expense Reimbursement', 'استرداد المصروفات',
    'Your expense reimbursement status', 'حالة استرداد مصروفاتك',
    'Dear {{first_name}},\n\nYour expense of {{amount}} ﷼ ({{category}}) has been {{status}}.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nتم {{status}} مصروفك البالغ {{amount}} ريال ({{category}}).\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'amount', 'category', 'status', 'from_name']
  );
  templateHelper(
    'document_reminder', 'Document Expiry Reminder', 'تذكير انتهاء صلاحية المستند',
    'Reminder: {{document_name}} expires soon', 'تذكير: {{document_name}} على وشك الانتهاء',
    'Dear {{first_name}},\n\nThis is a reminder that {{document_name}} expires on {{expiry_date}} (in {{days}} days). Please renew it.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nنذكرك بأن {{document_name}} ينتهي في {{expiry_date}} (بعد {{days}} يوم). يرجى تجديده.\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'document_name', 'expiry_date', 'days', 'from_name']
  );
  templateHelper(
    'announcement', 'Company Announcement', 'إعلان الشركة',
    '{{title}}', '{{title}}',
    '{{content}}\n\n{{from_name}}',
    '{{content}}\n\n{{from_name}}',
    ['title', 'content', 'from_name']
  );
  templateHelper(
    'onboarding', 'Onboarding Checklist', 'قائمة الانضمام',
    'Welcome aboard, {{first_name}}!', 'أهلاً بك، {{first_name}}!',
    'Dear {{first_name}},\n\nHere is your onboarding checklist. Please complete your paperwork and IT setup by {{start_date}}.\n\nBest regards,\n{{from_name}}',
    'عزيزي {{first_name}}،\n\nهذه قائمة الانضمام الخاصة بك. يرجى استكمال أوراقك وإعداد تقنية المعلومات قبل {{start_date}}.\n\nمع أطيب التحيات،\n{{from_name}}',
    ['first_name', 'start_date', 'from_name']
  );

  addExpense({ date: daysFromNow(0), amount: 245.5, category: 'Office Supplies', description: 'Printer paper and toner cartridges', paymentMethod: 'card', status: 'approved', requestedBy: 'user-1', vendor: 'Office Mart' });
  addExpense({ date: daysFromNow(0), amount: 120, category: 'Fuel', description: 'Fuel for company car', paymentMethod: 'cash', status: 'pending', requestedBy: 'user-1', vendor: 'Petromin' });
  addExpense({ date: daysFromNow(-1), amount: 980, category: 'Travel', description: 'Flight ticket to Jeddah for client meeting', paymentMethod: 'card', status: 'pending', requestedBy: 'user-1', vendor: 'Saudia' });
  addExpense({ date: daysFromNow(-1), amount: 340, category: 'Meals', description: 'Client lunch meeting', paymentMethod: 'card', status: 'rejected', requestedBy: 'user-1', vendor: 'Najd Village' });
  addExpense({ date: daysFromNow(-3), amount: 1500, category: 'Technology', description: 'External monitor for developer workstation', paymentMethod: 'card', status: 'reimbursed', requestedBy: 'user-1', vendor: 'iSTORE', reimbursedAt: daysFromNow(-2) });
  addExpense({ date: daysFromNow(-5), amount: 620, category: 'Transportation', description: 'Monthly parking permit', paymentMethod: 'bank_transfer', status: 'approved', requestedBy: 'user-1', vendor: 'Parking Co' });
  addExpense({ date: daysFromNow(-7), amount: 1850, category: 'Training', description: 'Project management course fees', paymentMethod: 'bank_transfer', status: 'pending', requestedBy: 'user-1', vendor: 'PMI Saudi' });

  addAuditLog('user-1', 'Admin User', 'Login', 'Admin logged in');
  addAuditLog('user-1', 'Admin User', 'Settings', 'Company profile updated');
  addAuditLog('user-2', 'Employee User', 'Login', 'Employee logged in');

  const sara = Array.from(employees.values()).find((e) => e.fullName === 'Sara Al-Qahtani');
  const fahad = Array.from(employees.values()).find((e) => e.fullName === 'Fahad Al-Dosari');
  const khalid = Array.from(employees.values()).find((e) => e.fullName === 'Khalid Al-Ghamdi');
  if (sara) {
    addLifecycle({
      companyId: 'demo-company',
      employeeId: sara.id,
      type: 'onboarding',
      status: 'in_progress',
      dueDate: daysFromNow(30),
      notes: 'New marketing hire onboarding',
      createdBy: 'user-1',
      startedAt: daysFromNow(-6),
      tasks: [
        { id: `${generateId()}-t1`, name: 'Sign employment contract', status: 'done', completedAt: daysFromNow(-6) },
        { id: `${generateId()}-t2`, name: 'Verify National ID / Iqama', status: 'done', completedAt: daysFromNow(-5) },
        { id: `${generateId()}-t3`, name: 'Issue company email & accounts', status: 'pending' },
        { id: `${generateId()}-t4`, name: 'Open bank account for payroll', status: 'pending' },
        { id: `${generateId()}-t5`, name: 'Apply for work permit', status: 'pending' },
      ],
    });
  }
  if (khalid) {
    addLifecycle({
      companyId: 'demo-company',
      employeeId: khalid.id,
      type: 'onboarding',
      status: 'completed',
      completedAt: daysFromNow(-20),
      createdBy: 'user-1',
      tasks: [
        { id: `${generateId()}-t1`, name: 'Sign employment contract', status: 'done', completedAt: daysFromNow(-21) },
        { id: `${generateId()}-t2`, name: 'Verify National ID / Iqama', status: 'done', completedAt: daysFromNow(-21) },
        { id: `${generateId()}-t3`, name: 'Issue company email & accounts', status: 'done', completedAt: daysFromNow(-20) },
        { id: `${generateId()}-t4`, name: 'Open bank account for payroll', status: 'done', completedAt: daysFromNow(-20) },
      ],
    });
  }
  if (fahad) {
    addLifecycle({
      companyId: 'demo-company',
      employeeId: fahad.id,
      type: 'offboarding',
      status: 'draft',
      dueDate: daysFromNow(10),
      createdBy: 'user-1',
      tasks: [
        { id: `${generateId()}-t1`, name: 'Conduct exit interview', status: 'pending' },
        { id: `${generateId()}-t2`, name: 'Complete duties handover', status: 'pending' },
        { id: `${generateId()}-t3`, name: 'Return company assets', status: 'pending' },
        { id: `${generateId()}-t4`, name: 'Revoke system & email access', status: 'pending' },
      ],
    });
  }
}

/**
 * Migration: older persisted demo documents were metadata-only (no file
 * bytes). Attach generated demo file content so the files-manager gallery
 * and viewer have something real to render. User-uploaded docs untouched.
 */
function backfillDemoDocumentFiles(): void {
  const backfills: Record<string, () => Pick<HRDocument, 'mimeType' | 'fileData' | 'fileName'>> = {
    'commercial-registration.pdf': () => ({
      fileName: 'commercial-registration.pdf',
      mimeType: 'application/pdf',
      fileData: demoPdf('Commercial Registration Certificate', [
        'Ministry of Commerce - Kingdom of Saudi Arabia',
        '',
        'CR Number: 1010-456789',
        'Company: SCOS Corp for Information Technology',
        'Legal form: Limited Liability Company (LLC)',
        'Capital: SAR 5,000,000',
        'City: Riyadh',
        '',
        'This certificate confirms the registration of the company in the',
        'commercial register. Renewal is required before the expiry date.',
        '',
        'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
      ]),
    }),
    'office-lease.pdf': () => ({
      fileName: 'office-lease.pdf',
      mimeType: 'application/pdf',
      fileData: demoPdf('Office Lease Agreement', [
        'Lessor: Riyadh Towers Real Estate Co.',
        'Lessee: SCOS Corp for Information Technology',
        '',
        'Premises: Floor 12, King Fahd Road, Riyadh',
        'Area: 850 sqm',
        'Annual rent: SAR 720,000 payable quarterly',
        'Term: 24 months, renewable by mutual agreement',
        '',
        'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
      ]),
    }),
    'ahmed-iqama.jpg': () => ({
      fileName: 'ahmed-iqama.svg',
      mimeType: 'image/svg+xml',
      fileData: demoIdCardImage({ name: 'Ahmed Al-Saud', nameAr: 'أحمد آل سعود', idNumber: '2345678901', expiry: '2026-09-27', accent: '#0F766E' }),
    }),
    'sara-iqama.jpg': () => ({
      fileName: 'sara-iqama.svg',
      mimeType: 'image/svg+xml',
      fileData: demoIdCardImage({ name: 'Sara Al-Qahtani', nameAr: 'سارة القحطاني', idNumber: '2456789012', expiry: '2026-10-12', accent: '#7C3AED' }),
    }),
    'health-policy.pdf': () => ({
      fileName: 'health-policy.pdf',
      mimeType: 'application/pdf',
      fileData: demoPdf('Group Health Insurance Policy', [
        'Insurer: Bupa Arabia (demo)',
        'Policyholder: SCOS Corp for Information Technology',
        '',
        'Class: VIP for managers, Class A for staff',
        'Covered members: all active employees and dependents',
        'Annual limit: SAR 500,000 per member',
        '',
        'This policy has EXPIRED and must be renewed immediately.',
        '',
        'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
      ]),
    }),
    'security-policy.docx': () => ({
      fileName: 'security-policy.txt',
      mimeType: 'text/plain',
      fileData: demoTextFile('Data Security Policy', [
        '1. All employee data is classified as confidential.',
        '2. Access to HR systems requires unique credentials; sharing accounts is prohibited.',
        '3. Documents containing personal data must be stored in the HR document vault only.',
        '4. External sharing of employee records requires written HR approval.',
        '5. Report suspected data incidents to it-security@scos.sa within 24 hours.',
        '',
        'DEMO SPECIMEN - generated for the SCOS HR demo environment.',
      ]),
    }),
  };
  for (const [id, doc] of Array.from(documents.entries())) {
    if (doc.fileData || !doc.fileName) continue;
    const make = backfills[doc.fileName];
    if (make) documents.set(id, { ...doc, ...make() });
  }
}

export function resetDemoData(): void {
  users = new Map([
    ['user-1', { ...demoAdmin, password: 'Password123!' }],
    ['user-2', { ...demoEmployee, password: 'Password123!' }],
  ]);
  companies = new Map([['demo-company', demoCompany]]);
  employees = new Map();
  employeeCounter = 0;
  leaves = new Map();
  notifications = new Map();
  attendanceRecords = new Map();
  payrolls = new Map();
  messages = new Map();
  channels = new Map();
  announcements = new Map();
  auditLogs = new Map();
  todos = new Map();
  documents = new Map();
  emailTemplates = new Map();
  emailOutbox = new Map();
  expenses = new Map();
  lifecycles = new Map();
  contracts = new Map();
  contractCounter = 0;
  manualReminders = [];
  zatcaInvoiceStore = new Map();
  zatcaSettingsStore = { ...DEFAULT_ZATCA_SETTINGS };
  docPrinterAssetsStore = {};
  seedDemoData();
  persistenceEnabled = true;
  persist();
}

let hydrated = false;

export function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  const persisted = loadPersistedData();
  if (persisted) {
    if (persisted.users?.length)
      users = new Map(persisted.users.map((u) => [u.id, { ...u, password: u.password || 'Password123!' }]));
    if (persisted.companies?.length) companies = new Map(persisted.companies.map((c) => [c.id, c]));
    employees = new Map(persisted.employees?.map((e) => [e.id, e]) ?? []);
    employeeCounter = employees.size;
    leaves = new Map(persisted.leaves?.map((l) => [l.id, l]) ?? []);
    notifications = new Map(persisted.notifications?.map((n) => [n.id, n]) ?? []);
    attendanceRecords = new Map(persisted.attendanceRecords?.map((r) => [r.id, r]) ?? []);
    payrolls = new Map(persisted.payrolls?.map((p) => [p.id, p]) ?? []);
    messages = new Map(persisted.messages?.map((m) => [m.id, m]) ?? []);
    channels = new Map(persisted.channels?.map((c) => [c.id, c]) ?? []);
    announcements = new Map(persisted.announcements?.map((a) => [a.id, a]) ?? []);
    auditLogs = new Map(persisted.auditLogs?.map((l) => [l.id, l]) ?? []);
    todos = new Map(persisted.todos?.map((t) => [t.id, t]) ?? []);
    documents = new Map(persisted.documents?.map((d) => [d.id, d]) ?? []);
    backfillDemoDocumentFiles();
    emailTemplates = new Map(persisted.emailTemplates?.map((t) => [t.id, t]) ?? []);
    emailOutbox = new Map(persisted.emailOutbox?.map((o) => [o.id, o]) ?? []);
    expenses = new Map(persisted.expenses?.map((e) => [e.id, e]) ?? []);
    lifecycles = new Map(persisted.lifecycles?.map((l) => [l.id, l]) ?? []);
    contracts = new Map(persisted.contracts?.map((c) => [c.id, c]) ?? []);
    contractCounter = contracts.size;
    manualReminders = persisted.manualReminders ?? [];
    if (persisted.emailSettings) emailSettings = { ...persisted.emailSettings };
    zatcaInvoiceStore = new Map(persisted.zatcaInvoices?.map((i) => [i.id, i]) ?? []);
    if (persisted.zatcaSettings) zatcaSettingsStore = { ...DEFAULT_ZATCA_SETTINGS, ...persisted.zatcaSettings };
    if (persisted.docPrinterAssets) docPrinterAssetsStore = { ...persisted.docPrinterAssets };
  } else {
    seedDemoData();
  }
  // Migrate any plaintext passwords to hashed form before the first persist.
  for (const [id, u] of Array.from(users.entries())) {
    if (shouldRehash(u.password)) {
      users.set(id, { ...u, password: hashPassword(u.password) });
    }
  }
  persistenceEnabled = true;
  persist();
}

// Load persisted data or seed on module import
ensureHydrated();
