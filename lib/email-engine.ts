import {
  emailTemplates,
  emailSettings,
  emailOutbox,
  addEmailTemplate as createEmailTemplate,
  updateEmailTemplate as patchEmailTemplate,
  deleteEmailTemplate as removeEmailTemplate,
  updateEmailSettings,
  addOutboundEmail,
  markOutboundEmail,
} from '@/lib/mock-data';
import { EmailOutbox } from '@/types';
import { EmailTemplate, EmailSettings, EmailTemplateCategory } from '@/types';

export const EMAIL_TEMPLATE_CATEGORIES: { value: EmailTemplateCategory; en: string; ar: string }[] = [
  { value: 'welcome', en: 'Welcome', ar: 'ترحيب' },
  { value: 'leave_approved', en: 'Leave Approved', ar: 'موافقة إجازة' },
  { value: 'leave_rejected', en: 'Leave Rejected', ar: 'رفض إجازة' },
  { value: 'leave_pending', en: 'Leave Pending', ar: 'إجازة قيد الانتظار' },
  { value: 'payroll', en: 'Payroll / Payslip', ar: 'الرواتب' },
  { value: 'announcement', en: 'Announcement', ar: 'إعلان' },
  { value: 'expense', en: 'Expense', ar: 'مصروفات' },
  { value: 'document_reminder', en: 'Document Reminder', ar: 'تذكير مستندات' },
  { value: 'onboarding', en: 'Onboarding', ar: 'انضمام' },
  { value: 'offboarding', en: 'Offboarding', ar: 'مغادرة' },
];

export function getCategoryLabel(category: EmailTemplateCategory, locale: 'en' | 'ar' = 'en'): string {
  const found = EMAIL_TEMPLATE_CATEGORIES.find((c) => c.value === category);
  if (!found) return category;
  return locale === 'ar' ? found.ar : found.en;
}

export function getEmailSettings(): EmailSettings {
  return emailSettings;
}

export function updateSettings(patch: Partial<EmailSettings>): EmailSettings {
  return updateEmailSettings(patch);
}

export function getEmailTemplates(filters?: { category?: string; search?: string }): EmailTemplate[] {
  let data = Array.from(emailTemplates.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (filters?.category) data = data.filter((t) => t.category === filters.category);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.nameAr.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
    );
  }
  return data;
}

export function getEmailTemplate(id: string): EmailTemplate | null {
  return emailTemplates.get(id) || null;
}

export function addEmailTemplate(data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): EmailTemplate {
  return createEmailTemplate(data);
}

export function updateEmailTemplate(id: string, patch: Partial<EmailTemplate>): { success: boolean; template?: EmailTemplate; error?: string } {
  const tpl = patchEmailTemplate(id, patch);
  if (!tpl) return { success: false, error: 'Email template not found' };
  return { success: true, template: tpl };
}

export function deleteEmailTemplate(id: string): { success: boolean; error?: string } {
  return removeEmailTemplate(id) ? { success: true } : { success: false, error: 'Email template not found' };
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] !== undefined ? vars[key] : match);
}

export function sendTestEmail(): { success: boolean; message: string } {
  if (emailSettings.provider === 'gmail' && emailSettings.gmail?.connected) {
    return {
      success: true,
      message: `Test email queued to ${emailSettings.gmail.accountEmail || 'your Gmail account'} (demo mode)`,
    };
  }
  return { success: true, message: 'Test email queued successfully (demo mode)' };
}

export interface SendEmailInput {
  to: { name?: string; email: string }[];
  subject: string;
  body: string;
  templateId?: string;
  createdBy?: string;
}

export function sendEmail(input: SendEmailInput): { success: boolean; message: string; id?: string; error?: string } {
  const recipients = input.to.filter((r) => r.email.trim());
  if (recipients.length === 0) {
    return { success: false, message: '', error: 'At least one recipient is required' };
  }
  if (!input.subject.trim() || !input.body.trim()) {
    return { success: false, message: '', error: 'Subject and body are required' };
  }

  if (emailSettings.provider === 'gmail' && emailSettings.gmail?.connected) {
    for (const r of recipients) {
      addOutboundEmail({
        toName: r.name,
        toEmail: r.email,
        subject: input.subject,
        body: input.body,
        templateId: input.templateId,
        createdBy: input.createdBy,
      });
    }
    return { success: true, message: `Queued ${recipients.length} message(s) via Gmail` };
  }

  const first = addOutboundEmail({
    toName: recipients[0].name,
    toEmail: recipients[0].email,
    subject: input.subject,
    body: input.body,
    templateId: input.templateId,
    createdBy: input.createdBy,
  });
  for (const r of recipients.slice(1)) {
    addOutboundEmail({ toName: r.name, toEmail: r.email, subject: input.subject, body: input.body, templateId: input.templateId, createdBy: input.createdBy });
  }
  return {
    success: true,
    message: `Message queued for ${recipients.length} recipient(s) (${first.id})`,
    id: first.id,
  };
}

export function getOutbox(limit = 50): EmailOutbox[] {
  return Array.from(emailOutbox.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

async function deliverOne(item: EmailOutbox): Promise<'sent' | 'failed'> {
  if (emailSettings.provider === 'gmail' && emailSettings.gmail?.connected) {
    try {
      const { sendViaGmail } = await import('@/lib/gmail-provider');
      await sendViaGmail({ to: item.toEmail, subject: item.subject, text: item.body });
      return 'sent';
    } catch (e) {
      console.error('[email] gmail delivery failed', (e as Error).message);
      return 'failed';
    }
  }

  if (!emailSettings.smtpHost || !emailSettings.smtpUser) {
    return 'failed';
  }

  try {
    const { sendViaSmtp } = await import('@/lib/smtp-provider');
    await sendViaSmtp({ to: item.toEmail, subject: item.subject, text: item.body, html: undefined }, {
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      user: emailSettings.smtpUser,
      pass: emailSettings.smtpPassword,
      encryption: emailSettings.encryption,
      fromName: emailSettings.fromName,
      fromEmail: emailSettings.fromEmail,
    });
    return 'sent';
  } catch (e) {
    console.error('[email] smtp delivery failed', (e as Error).message);
    return 'failed';
  }
}

export async function deliverOutboxItem(id: string): Promise<{ success: boolean; message: string; error?: string }> {
  const item = emailOutbox.get(id);
  if (!item) return { success: false, message: '', error: 'Outbox item not found' };

  const result = await deliverOne(item);
  if (result === 'sent') {
    markOutboundEmail(id, 'sent');
    return { success: true, message: 'Message delivered' };
  }
  markOutboundEmail(id, 'failed');
  return { success: false, message: '', error: 'Delivery failed. Check SMTP/Gmail settings.' };
}

export async function flushOutbox(): Promise<{ delivered: number; failed: number }> {
  let delivered = 0;
  let failed = 0;
  const queued = Array.from(emailOutbox.values()).filter((m) => m.status === 'queued');
  for (const item of queued) {
    const result = await deliverOne(item);
    if (result === 'sent') {
      markOutboundEmail(item.id, 'sent');
      delivered++;
    } else {
      markOutboundEmail(item.id, 'failed');
      failed++;
    }
  }
  return { delivered, failed };
}

export async function sendTestEmailAsync(): Promise<{ success: boolean; message: string; error?: string }> {
  if (emailSettings.provider !== 'gmail' || !emailSettings.gmail?.connected) {
    return sendTestEmail();
  }
  try {
    const { sendViaGmail } = await import('@/lib/gmail-provider');
    const { id } = await sendViaGmail({
      to: emailSettings.gmail!.accountEmail || emailSettings.fromEmail,
      subject: 'SCOS HR — Test email',
      text: 'This is a test email sent from SCOS HR via your Google (Gmail) account.\n\nIf you received this, the Gmail integration is working.',
    });
    return { success: true, message: `Test email sent via Gmail (message id ${id})` };
  } catch (e) {
    return { success: false, message: '', error: (e as Error).message };
  }
}

export async function sendEmailViaProvider(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  if (emailSettings.provider !== 'gmail' || !emailSettings.gmail?.connected) {
    return { success: false, message: '', error: 'Gmail is not connected. Connect a Google account in Email Settings first.' };
  }
  try {
    const { sendViaGmail } = await import('@/lib/gmail-provider');
    const { id } = await sendViaGmail(opts);
    return { success: true, message: `Sent via Gmail (message id ${id})` };
  } catch (e) {
    return { success: false, message: '', error: (e as Error).message };
  }
}