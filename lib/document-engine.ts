import {
  documents,
  addDocument as createDocument,
  updateDocument as patchDocument,
  deleteDocument as removeDocument,
  addNotification,
} from '@/lib/mock-data';
import { HRDocument, DocumentCategory } from '@/types';

export type { HRDocument, DocumentCategory };

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; en: string; ar: string }[] = [
  { value: 'contract', en: 'Contract', ar: 'عقد' },
  { value: 'id_iqama', en: 'ID / Iqama', ar: 'هوية / إقامة' },
  { value: 'passport', en: 'Passport', ar: 'جواز سفر' },
  { value: 'visa', en: 'Visa', ar: 'تأشيرة' },
  { value: 'certificate', en: 'Certificate', ar: 'شهادة' },
  { value: 'insurance', en: 'Insurance', ar: 'تأمين' },
  { value: 'vehicle', en: 'Vehicle', ar: 'مركبة' },
  { value: 'real_estate', en: 'Real Estate', ar: 'عقار' },
  { value: 'license', en: 'License', ar: 'رخصة' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
];

export function getCategoryLabel(category: string, locale: 'en' | 'ar' = 'en'): string {
  const found = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  if (!found) return category;
  return locale === 'ar' ? found.ar : found.en;
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export type DocumentHealth = 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';

export function getDocumentHealth(doc: HRDocument): DocumentHealth {
  const days = daysUntil(doc.expiryDate);
  if (days === null) return 'no_expiry';
  if (days < 0) return 'expired';
  if (days <= doc.remindDaysBefore) return 'expiring_soon';
  return 'valid';
}

export function getDocuments(filters?: { category?: string; status?: string; search?: string }): HRDocument[] {
  let data = Array.from(documents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (filters?.category) data = data.filter((d) => d.category === filters.category);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.nameAr || '').toLowerCase().includes(q) ||
        (d.owner || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
    );
  }
  if (filters?.status) {
    data = data.filter((d) => getDocumentHealth(d) === filters.status);
  }
  return data;
}

export function getDocument(id: string): HRDocument | null {
  return documents.get(id) || null;
}

export function addDocument(data: Omit<HRDocument, 'id' | 'createdAt' | 'updatedAt'>): HRDocument {
  return createDocument(data);
}

export function updateDocument(id: string, patch: Partial<HRDocument>): { success: boolean; document?: HRDocument; error?: string } {
  const doc = patchDocument(id, patch);
  if (!doc) return { success: false, error: 'Document not found' };
  return { success: true, document: doc };
}

export function deleteDocument(id: string): { success: boolean; error?: string } {
  return removeDocument(id) ? { success: true } : { success: false, error: 'Document not found' };
}

export function getExpiringDocuments(days: number): HRDocument[] {
  return Array.from(documents.values()).filter((d) => {
    const left = daysUntil(d.expiryDate);
    return left !== null && left >= 0 && left <= days;
  });
}

export function getDocumentAlerts(): {
  expired: HRDocument[];
  expiringSoon: HRDocument[];
  total: number;
} {
  const all = Array.from(documents.values());
  const expired = all.filter((d) => getDocumentHealth(d) === 'expired');
  const expiringSoon = all.filter((d) => getDocumentHealth(d) === 'expiring_soon');
  return { expired, expiringSoon, total: all.length };
}

export function sendExpiryReminders(): { sent: number } {
  const soon = getExpiringDocuments(30);
  soon.forEach((doc) => {
    const left = daysUntil(doc.expiryDate);
    addNotification({
      companyId: 'demo-company',
      userId: 'user-1',
      title: 'Document Expiry Reminder',
      titleAr: 'تذكير بانتهاء صلاحية مستند',
      message: `"${doc.name}" ${left !== null && left < 0 ? 'has expired' : `expires in ${left} day(s)`}. Please renew it.`,
      messageAr: `"${doc.name}" ${left !== null && left < 0 ? 'انتهت صلاحيته' : `ينتهي خلال ${left} يوم`}. يرجى تجديده.`,
      type: left !== null && left < 0 ? 'error' : 'warning',
      read: false,
      link: '/documents',
    });
  });
  return { sent: soon.length };
}
