import {
  User,
  Company,
  Employee,
  LeaveRequest,
  ModuleDefinition,
  Notification,
  Message,
  Announcement,
  AuditLog,
  Attendance,
  Payroll,
  Department,
  CompanySettings,
  Branding,
} from '@/types';
import { generateId, formatEmployeeId } from './utils';

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
    holidays: [
      { id: 'h1', name: 'Saudi National Day', nameAr: 'اليوم الوطني السعودي', date: '2024-09-23', isRecurring: true },
      { id: 'h2', name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', date: '2024-04-10', isRecurring: false },
      { id: 'h3', name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', date: '2024-06-16', isRecurring: false },
      { id: 'h4', name: 'Saudi Founding Day', nameAr: 'يوم التأسيس السعودي', date: '2024-02-22', isRecurring: true },
      { id: 'h5', name: 'National Flag Day', nameAr: 'يوم العلم', date: '2024-03-11', isRecurring: true },
    ],
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
    primaryColor: '#009B77',
    secondaryColor: '#00205B',
    accentColor: '#FFC72C',
    theme: 'light',
  },
  moduleStates: {
    'employee-management': true,
    'leave-management': true,
    'payroll': true,
    'attendance': true,
    'communication': true,
    'reports': true,
    'administration': true,
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

export let announcements: Map<string, Announcement> = new Map();

export let auditLogs: Map<string, AuditLog> = new Map();

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
    name: 'Communication',
    nameAr: 'التواصل',
    description: 'Internal messaging and announcements',
    descriptionAr: 'الرسائل الداخلية والإعلانات',
    icon: 'MessageSquare',
    dependencies: [],
    enabled: true,
    route: '/communication',
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
];

export function getCompany(): Company | undefined {
  return companies.get('demo-company');
}

export function updateCompany(updates: Partial<Company>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  Object.assign(company, updates, { updatedAt: new Date().toISOString() });
  return company;
}

export function updateCompanySettings(settings: Partial<CompanySettings>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.settings = { ...company.settings, ...settings };
  company.updatedAt = new Date().toISOString();
  return company;
}

export function updateCompanyBranding(branding: Branding): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.branding = branding;
  company.updatedAt = new Date().toISOString();
  return company;
}

export function setModuleStates(states: Record<string, boolean>): Company | undefined {
  const company = companies.get('demo-company');
  if (!company) return undefined;
  company.moduleStates = states;
  company.updatedAt = new Date().toISOString();
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
  users.set(id, { ...user, password: data.password || 'Password123!' });
  return user;
}

export function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'nameAr' | 'role' | 'language' | 'avatar'>>): User | undefined {
  const existing = users.get(id);
  if (!existing) return undefined;
  const updated: User = { ...existing, ...updates };
  users.set(id, { ...updated, password: existing.password });
  return updated;
}

export function deleteUser(id: string): boolean {
  return users.delete(id);
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
  return next;
}

export function deleteEmployee(id: string): boolean {
  const removed = employees.delete(id);
  if (removed) {
    const company = companies.get('demo-company');
    if (company) company.employeeCount = employees.size;
  }
  return removed;
}

export function deleteLeave(id: string): boolean {
  return leaves.delete(id);
}

export function addLeave(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): LeaveRequest {
  const leave: LeaveRequest = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leaves.set(leave.id, leave);
  return leave;
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const n: Notification = {
    ...notification,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  notifications.set(n.id, n);
  return n;
}

export function addAttendance(record: Omit<Attendance, 'id'>): Attendance {
  const r: Attendance = { ...record, id: generateId() };
  attendanceRecords.set(r.id, r);
  return r;
}

export function addPayroll(record: Omit<Payroll, 'id'>): Payroll {
  const p: Payroll = { ...record, id: generateId() };
  payrolls.set(p.id, p);
  return p;
}

export function addMessage(data: Omit<Message, 'id' | 'timestamp'>): Message {
  const m: Message = { ...data, id: generateId(), timestamp: new Date().toISOString() };
  messages.set(m.id, m);
  return m;
}

export function addAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  const a: Announcement = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  announcements.set(a.id, a);
  return a;
}

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

  const demoEmployees = [
    { fullName: 'Ahmed Al-Saud', fullNameAr: 'أحمد آل سعود', email: 'ahmed@scos.sa', phone: '+966501234561', nationalId: '1012345678', gender: 'male' as const, maritalStatus: 'married' as const, dateOfBirth: '1985-03-14', hireDate: '2020-01-15', department: 'Engineering', position: 'Senior Manager', contractType: 'permanent' as const, basic: 25000, housing: 10000, transport: 3000, managerId: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567890' },
    { fullName: 'Sara Al-Qahtani', fullNameAr: 'سارة القحطاني', email: 'sara@scos.sa', phone: '+966501234562', nationalId: '1023456789', gender: 'female' as const, maritalStatus: 'single' as const, dateOfBirth: '1991-07-22', hireDate: '2021-03-01', department: 'Marketing', position: 'Marketing Manager', contractType: 'permanent' as const, basic: 20000, housing: 8000, transport: 2500, managerId: undefined, bankName: 'Riyad Bank', bankAccount: 'SA0123456789001234567891' },
    { fullName: 'Mohammed Al-Otaibi', fullNameAr: 'محمد العتيبي', email: 'mohammed@scos.sa', phone: '+966501234563', nationalId: '1034567890', gender: 'male' as const, maritalStatus: 'single' as const, dateOfBirth: '1993-11-05', hireDate: '2022-06-01', department: 'Finance', position: 'Financial Analyst', contractType: 'fixed_term' as const, basic: 15000, housing: 6000, transport: 2000, managerId: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567892' },
    { fullName: 'Nora Al-Harbi', fullNameAr: 'نورة الحربي', email: 'nora@scos.sa', phone: '+966501234564', nationalId: '1045678901', gender: 'female' as const, maritalStatus: 'married' as const, dateOfBirth: '1988-09-30', hireDate: '2021-01-10', department: 'HR', position: 'HR Specialist', contractType: 'permanent' as const, basic: 14000, housing: 5000, transport: 2000, managerId: undefined, bankName: 'Saudi British Bank', bankAccount: 'SA0123456789001234567893' },
    { fullName: 'Fahad Al-Dosari', fullNameAr: 'فهد الدوسري', email: 'fahad@scos.sa', phone: '+966501234565', nationalId: '1056789012', gender: 'male' as const, maritalStatus: 'single' as const, dateOfBirth: '1996-02-18', hireDate: '2023-09-01', department: 'Operations', position: 'Operations Coordinator', contractType: 'probation' as const, basic: 10000, housing: 4000, transport: 1500, managerId: undefined, bankName: 'Alinma Bank', bankAccount: 'SA0123456789001234567894' },
    { fullName: 'Lama Al-Shammari', fullNameAr: 'لمى الشمري', email: 'lama@scos.sa', phone: '+966501234566', nationalId: '1067890123', gender: 'female' as const, maritalStatus: 'single' as const, dateOfBirth: '1994-05-12', hireDate: '2022-02-14', department: 'Sales', position: 'Sales Executive', contractType: 'permanent' as const, basic: 12000, housing: 5000, transport: 2000, managerId: undefined, bankName: 'Bank Albilad', bankAccount: 'SA0123456789001234567895' },
    { fullName: 'Khalid Al-Ghamdi', fullNameAr: 'خالد الغامدي', email: 'khalid@scos.sa', phone: '+966501234567', nationalId: '1078901234', gender: 'male' as const, maritalStatus: 'married' as const, dateOfBirth: '1990-01-25', hireDate: '2020-05-20', department: 'Engineering', position: 'Software Engineer', contractType: 'fixed_term' as const, basic: 18000, housing: 7000, transport: 2500, managerId: undefined, bankName: 'Al Rajhi Bank', bankAccount: 'SA0123456789001234567896' },
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
      nationality: 'Saudi',
      religion: 'muslim',
      gender: emp.gender,
      maritalStatus: emp.maritalStatus,
      dateOfBirth: emp.dateOfBirth,
      hireDate: emp.hireDate,
      contractType: emp.contractType,
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
    });
    void created;
  }

  const seeded = Array.from(employees.values());
  if (seeded[0]) seeded[0].userId = 'user-1';
  if (seeded[1]) seeded[1].userId = 'user-2';

  const empEntries = Array.from(employees.values());
  if (empEntries.length >= 2) {
    addLeave({
      employeeId: empEntries[0].id,
      companyId: 'demo-company',
      type: 'annual',
      startDate: '2024-07-01',
      endDate: '2024-07-10',
      daysCount: 10,
      reason: 'Family vacation',
      status: 'approved',
      approvedBy: 'user-1',
      approvedAt: '2024-06-20',
      attachments: [],
    });
    addLeave({
      employeeId: empEntries[1].id,
      companyId: 'demo-company',
      type: 'sick',
      startDate: '2024-07-15',
      endDate: '2024-07-16',
      daysCount: 2,
      reason: 'Medical appointment',
      status: 'pending',
      attachments: [],
    });
  }

  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'Welcome to SCOS', titleAr: 'مرحباً بك في SCOS', message: 'Your account has been created successfully.', messageAr: 'تم إنشاء حسابك بنجاح.', type: 'success', read: false, link: '/' });
  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'New Leave Request', titleAr: 'طلب إجازة جديد', message: 'Sara Al-Qahtani has submitted a sick leave request.', messageAr: 'قامت سارة القحطاني بتقديم طلب إجازة مرضية.', type: 'info', read: false, link: '/leaves' });
  addNotification({ companyId: 'demo-company', userId: 'user-1', title: 'Payroll Complete', titleAr: 'اكتمال معالجة الرواتب', message: 'July payroll has been processed successfully.', messageAr: 'تمت معالجة رواتب يوليو بنجاح.', type: 'success', read: false, link: '/payroll' });

  addMessage({ senderId: 'user-1', senderName: 'System', content: 'Welcome to the SCOS Communication Center!' });
  addAnnouncement({ title: 'Company Holiday Update', titleAr: 'تحديث الإجازة الرسمية', content: 'The company will observe the upcoming Saudi National Day as an official holiday.', contentAr: 'ستحتفل الشركة باليوم الوطني السعودي القادم كإجازة رسمية.', author: 'HR Department', priority: 'high' });

  addAuditLog('user-1', 'Admin User', 'Login', 'Admin logged in');
  addAuditLog('user-1', 'Admin User', 'Settings', 'Company profile updated');
  addAuditLog('user-2', 'Employee User', 'Login', 'Employee logged in');
}

// Seed data on module import
seedDemoData();
