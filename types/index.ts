export type Language = 'en' | 'ar';
export type UserRole = 'admin' | 'hr_manager' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  nameAr?: string;
  role: UserRole;
  companyId: string;
  avatar?: string;
  language: Language;
}

export type ThemeVariant = 'light' | 'dark' | 'auto';

export interface ThemeTokens {
  paper: string;
  card: string;
  card2: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  line2: string;
  brand: string;
  brandStrong: string;
  brandDeep: string;
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  accent: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  err: string;
  errSoft: string;
  info: string;
  infoSoft: string;
  radius: string;
}

export interface Branding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  theme: ThemeVariant;
  tokens?: ThemeTokens;
}

export interface WorkWeek {
  startDay: number;
  endDay: number;
  hoursPerDay: number;
  daysPerWeek: number;
}

export interface Holiday {
  id: string;
  name: string;
  nameAr: string;
  date: string;
  isRecurring: boolean;
}

export type LeaveType = 'annual' | 'sick' | 'personal' | 'emergency' | 'maternity' | 'paternity' | 'hajj' | 'unpaid';

export interface LeavePolicy {
  type: LeaveType;
  daysPerYear: number;
  carryoverDays: number;
  requiresApproval: boolean;
  paid: boolean;
}

export interface CompanySettings {
  workWeek: WorkWeek;
  weekendDays: number[];
  holidays: Holiday[];
  leavePolicies: LeavePolicy[];
  workingHours: { start: string; end: string };
  overtimeRate: number;
  gosiEnabled: boolean;
  wpsEnabled: boolean;
}

export interface ModuleStates {
  [key: string]: boolean;
}

export interface Company {
  id: string;
  name: string;
  nameAr?: string;
  taxNumber: string;
  industry: string;
  employeeCount: number;
  establishedDate: string;
  settings: CompanySettings;
  branding: Branding;
  moduleStates: ModuleStates;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  dependencies: string[];
  enabled: boolean;
  route: string;
}

export type ContractStatus = 'active' | 'expiring' | 'expired';
export type AgreementType =
  | 'employment'
  | 'service'
  | 'nda'
  | 'vendor'
  | 'client'
  | 'contractor'
  | 'partnership'
  | 'lease'
  | 'amendment';

export interface Contract {
  id: string;
  contractNo: string;
  contractType: AgreementType;
  title: string;
  partyA: string;
  partyB: string;
  employeeId?: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  renewalNoticeDays: number;
  value: number;
  currency: string;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  nameAr: string;
  managerId?: string;
  employeeCount: number;
}

export type ContractType = 'permanent' | 'fixed_term' | 'part_time' | 'probation';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'suspended';

export interface SalaryInfo {
  basic: number;
  housing: number;
  transportation: number;
  otherAllowances: number;
  total: number;
  bankName: string;
  bankAccount: string;
  iban: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export type LifecycleType = 'onboarding' | 'offboarding';
export type LifecycleStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type LifecycleTaskStatus = 'pending' | 'done';

export interface LifecycleTask {
  id: string;
  name: string;
  nameAr?: string;
  status: LifecycleTaskStatus;
  completedAt?: string;
}

export interface EmployeeLifecycle {
  id: string;
  companyId: string;
  employeeId: string;
  type: LifecycleType;
  status: LifecycleStatus;
  tasks: LifecycleTask[];
  dueDate?: string;
  notes?: string;
  createdBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  companyId: string;
  userId?: string;
  fullName: string;
  fullNameAr: string;
  email: string;
  phone: string;
  nationalId: string;
  iqamaNumber?: string;
  nationality: string;
  religion: 'muslim' | 'other';
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth: string;
  hireDate: string;
  contractType: ContractType;
  contractEndDate?: string;
  department: string;
  position: string;
  managerId?: string;
  salary: SalaryInfo;
  address: Address;
  emergencyContact: EmergencyContact;
  status: EmployeeStatus;
  documents: Document[];
  sponsorName?: string;
  sponsorId?: string;
  annualVacationDays?: number;
  vacationBalance?: number;
  endOfServiceAllowance?: number;
  probationEndDate?: string;
  workPermitExpiry?: string;
  iqamaExpiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnPickerColumn {
  key: string;
  label: string;
  labelAr: string;
  group: string;
  groupAr: string;
  defaultVisible?: boolean;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  companyId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  attachments: Document[];
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'overtime';

export interface Attendance {
  id: string;
  employeeId: string;
  companyId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  status: AttendanceStatus;
  notes?: string;
  location?: { lat: number; lng: number } | null;
  hoursWorked?: number;
}

export type PayrollStatus = 'draft' | 'processing' | 'completed' | 'cancelled';

export interface Deduction {
  type: string;
  amount: number;
  description: string;
}

export interface Addition {
  type: string;
  amount: number;
  description: string;
}

export interface Payroll {
  id: string;
  companyId: string;
  period: string;
  employeeId: string;
  employeeName?: string;
  employeeDisplayId?: string;
  salary: SalaryInfo;
  deductions: Deduction[];
  additions: Addition[];
  gosiContribution: number;
  netPay: number;
  status: PayrollStatus;
  processedAt?: string;
  timesheet?: PayrollTimesheet;
}

export interface PayrollTimesheet {
  daysWorked: number;
  dailyRate: number;
  basePay: number;
  otHours: number;
  otRate: number;
  otPay: number;
  grossPay: number;
}

export interface GOSIRate {
  id: string;
  label: string;
  labelAr: string;
  employee: number;
  employer: number;
  note: string;
  noteAr: string;
  saudiOnly?: boolean;
}

export interface GOSIBreakdown {
  applicableWage: number;
  isSaudi: boolean;
  rows: {
    id: string;
    label: string;
    labelAr: string;
    note: string;
    noteAr: string;
    employeeShare: number;
    employerShare: number;
  }[];
  totalEmployee: number;
  totalEmployer: number;
  total: number;
}

export interface MessageAttachment {
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  channelId?: string;
  content: string;
  attachment?: MessageAttachment;
  timestamp: string;
  reactions?: MessageReaction[];
  editedAt?: string;
  deletedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
}

export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  author: string;
  createdAt: string;
  priority: AnnouncementPriority;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// To-Do module
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: string;
  category?: string;
  assignee?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

// Document module
export type DocumentCategory =
  | 'contract'
  | 'id_iqama'
  | 'passport'
  | 'visa'
  | 'certificate'
  | 'insurance'
  | 'vehicle'
  | 'real_estate'
  | 'license'
  | 'other';

export interface HRDocument {
  id: string;
  name: string;
  nameAr?: string;
  category: DocumentCategory;
  description?: string;
  fileName?: string;
  fileSize?: number;
  expiryDate?: string;
  remindDaysBefore: number;
  owner?: string;
  department?: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Email module
export type EmailTemplateCategory =
  | 'welcome'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_pending'
  | 'payroll'
  | 'announcement'
  | 'expense'
  | 'document_reminder'
  | 'onboarding'
  | 'offboarding';

export interface EmailOutbox {
  id: string;
  companyId: string;
  toName?: string;
  toEmail: string;
  subject: string;
  body: string;
  templateId?: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  sentAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: EmailTemplateCategory;
  subject: string;
  subjectAr: string;
  body: string;
  bodyAr: string;
  variables: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSettings {
  provider: 'smtp' | 'gmail';
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  encryption: 'none' | 'tls' | 'ssl';
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRedirectUri?: string;
  gmail?: {
    connected: boolean;
    accountEmail?: string;
    accountName?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  enabled: boolean;
  updatedAt?: string;
}

// Expense module
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_payment' | 'other';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  paymentMethod: PaymentMethod;
  vendor?: string;
  status: ExpenseStatus;
  receiptNumber?: string;
  requestedBy: string;
  reimbursedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
}
