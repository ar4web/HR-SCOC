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

export interface Branding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  theme: ThemeVariant;
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
  createdAt: string;
  updatedAt: string;
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
  salary: SalaryInfo;
  deductions: Deduction[];
  additions: Addition[];
  gosiContribution: number;
  netPay: number;
  status: PayrollStatus;
  processedAt?: string;
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

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
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
