import { z } from 'zod';

export const emailSchema = z.string().email();

const dateLike = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));

export const salarySchema = z.object({
  basic: z.number().nonnegative().max(1_000_000),
  housing: z.number().nonnegative().max(1_000_000),
  transportation: z.number().nonnegative().max(1_000_000),
  otherAllowances: z.number().nonnegative().max(1_000_000),
  total: z.number().nonnegative().max(5_000_000).optional(),
  bankName: z.string().max(120).optional(),
  bankAccount: z.string().max(40).optional(),
  iban: z.string().max(34).optional(),
});

export const contractTypeSchema = z.enum(['permanent', 'fixed_term', 'part_time', 'probation']);
export const employeeStatusSchema = z.enum(['active', 'inactive', 'terminated', 'suspended']);
export const genderSchema = z.enum(['male', 'female']);
export const maritalStatusSchema = z.enum(['single', 'married', 'divorced', 'widowed']);
export const religionSchema = z.enum(['muslim', 'other']);

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(80).optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().max(120).optional(),
  relation: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
});

const employeeBase = z.object({
  fullName: z.string().min(2).max(120),
  fullNameAr: z.string().max(120).optional(),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  nationalId: z.string().min(1).max(40),
  iqamaNumber: z.string().max(40).optional(),
  nationality: z.string().max(60).default('Saudi'),
  religion: religionSchema.default('muslim'),
  gender: genderSchema,
  maritalStatus: maritalStatusSchema,
  dateOfBirth: dateLike,
  hireDate: dateLike,
  contractType: contractTypeSchema,
  contractEndDate: dateLike.optional(),
  department: z.string().min(1).max(80),
  position: z.string().min(1).max(80),
  salary: salarySchema,
  status: employeeStatusSchema.default('active'),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  documents: z.array(z.unknown()).optional(),
  sponsorName: z.string().max(120).optional(),
  sponsorId: z.string().max(40).optional(),
  annualVacationDays: z.number().int().min(1).max(365).optional(),
  vacationBalance: z.number().int().min(0).max(365).optional(),
  endOfServiceAllowance: z.number().nonnegative().max(1_000_000).optional(),
  probationEndDate: dateLike.optional(),
  workPermitExpiry: dateLike.optional(),
  iqamaExpiryDate: dateLike.optional(),
});

export const employeeCreateSchema = employeeBase.passthrough();

export const employeeUpdateSchema = employeeBase.partial().strict();

export const companyUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  nameAr: z.string().max(120).optional(),
  taxNumber: z.string().max(40).optional(),
  industry: z.string().max(80).optional(),
  establishedDate: dateLike.optional(),
  settings: z.object({
    workingHours: z.object({ start: z.string().max(8), end: z.string().max(8) }).optional(),
    weekendDays: z.array(z.number().int().min(0).max(6)).optional(),
    overtimeRate: z.number().nonnegative().max(10).optional(),
    gosiEnabled: z.boolean().optional(),
    wpsEnabled: z.boolean().optional(),
  }).optional(),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logo: z.string().max(500).optional(),
  }).passthrough().optional(),
}).passthrough();

export const messageSchema = z.object({
  type: z.literal('message'),
  senderId: z.string().max(80).optional(),
  senderName: z.string().max(120).optional(),
  content: z.string().min(1).max(4000),
  attachment: z.object({
    type: z.enum(['image', 'file']).optional(),
    name: z.string().max(200),
    url: z.string().max(1000),
    size: z.number().int().nonnegative().max(50 * 1024 * 1024),
  }).optional(),
  recipientId: z.string().max(80).optional(),
  channelId: z.string().max(80).optional(),
}).passthrough();

export const announcementSchema = z.object({
  type: z.literal('announcement'),
  title: z.string().min(1).max(200),
  titleAr: z.string().max(200).optional(),
  content: z.string().min(1).max(8000),
  contentAr: z.string().max(8000).optional(),
  author: z.string().max(120).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
}).passthrough();

export const channelSchema = z.object({
  type: z.literal('channel'),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  companyId: z.string().max(80).optional(),
  memberIds: z.array(z.string().max(80)).optional(),
  createdBy: z.string().max(80).optional(),
}).passthrough();

export const documentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).optional(),
  type: z.string().max(40).optional(),
  issueDate: z.string().max(30).optional(),
  expiryDate: z.string().max(30).optional(),
  owner: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  remindDaysBefore: z.number().int().min(0).max(365).optional(),
  status: z.string().max(20).optional(),
  uploadedAt: z.string().max(40).optional(),
  uploadedBy: z.string().max(120).optional(),
}).passthrough();

export function parseWith<T>(schema: z.ZodType<T>, body: unknown):
  { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  return {
    ok: false,
    error: first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid request body',
  };
}