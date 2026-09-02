'use client';

// Spark Desktop–style email center.
// Layout copied from Spark Mail: a dark icon rail + dark folder sidebar on the
// far side, a clean borderless message list with date-group headers and round
// sender avatars, a minimal reading pane, and a Spark-like compose sheet with
// hairline fields. All data flows use the existing emailService endpoints —
// only the presentation layer is different.

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { usePageSearch } from '@/stores/search-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { emailService, GmailStatus } from '@/modules/email/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { EmailTemplate, EmailSettings, EmailTemplateCategory, Employee } from '@/types';
import { employeeService } from '@/modules/employee-management/service';
import { t, formatDate } from '@/lib/utils';
import {
  Mail, Plus, Trash2, Pencil, Settings, LayoutTemplate, Chrome,
  SendHorizonal, Save, X, Clock, CheckCheck, AlertTriangle, ChevronLeft,
  Inbox, RefreshCw, Menu, Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* constants & helpers                                                 */
/* ------------------------------------------------------------------ */

// Spark's signature blue.
const SPARK = '#3478F6';

const templateCategories: { value: EmailTemplateCategory; en: string; ar: string }[] = [
  { value: 'welcome', en: 'Welcome', ar: 'ترحيب' },
  { value: 'leave_approved', en: 'Leave Approved', ar: 'موافقة إجازة' },
  { value: 'leave_rejected', en: 'Leave Rejected', ar: 'رفض إجازة' },
  { value: 'leave_pending', en: 'Leave Pending', ar: 'إجازة قيد الانتظار' },
  { value: 'payroll', en: 'Payroll', ar: 'الرواتب' },
  { value: 'announcement', en: 'Announcement', ar: 'إعلان' },
  { value: 'expense', en: 'Expense', ar: 'مصروفات' },
  { value: 'document_reminder', en: 'Document Reminder', ar: 'تذكير مستندات' },
  { value: 'onboarding', en: 'Onboarding', ar: 'انضمام' },
  { value: 'offboarding', en: 'Offboarding', ar: 'مغادرة' },
];

function categoryLabel(value: string, locale: 'en' | 'ar'): string {
  const c = templateCategories.find((x) => x.value === value);
  if (!c) return value;
  return locale === 'ar' ? c.ar : c.en;
}

const AVATAR_TONES = [
  'bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-fuchsia-500',
];

function avatarTone(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type OutboxMessage = { id: string; toEmail: string; toName?: string; subject: string; status: string; createdAt: string };

function dateGroup(iso: string, language: 'en' | 'ar'): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return t('Today', 'اليوم', language);
  if (diffDays === 1) return t('Yesterday', 'أمس', language);
  if (diffDays < 7) return t('Last Week', 'الأسبوع الماضي', language);
  return t('Earlier', 'سابقًا', language);
}

function listTime(iso: string, language: 'en' | 'ar'): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' });
}

const selectCls =
  'block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/40';

const statusMeta: Record<string, { classes: string; en: string; ar: string; icon: React.ElementType }> = {
  queued: { classes: 'bg-amber-50 text-amber-600', en: 'Queued', ar: 'بالانتظار', icon: Clock },
  sent: { classes: 'bg-emerald-50 text-emerald-600', en: 'Sent', ar: 'مُرسلة', icon: CheckCheck },
  failed: { classes: 'bg-red-50 text-red-600', en: 'Failed', ar: 'فشلت', icon: AlertTriangle },
};

type Section = 'outbox' | 'templates' | 'settings';
type Folder = 'all' | 'queued' | 'sent' | 'failed';

const emptyForm = {
  name: '', nameAr: '', category: 'welcome' as EmailTemplateCategory,
  subject: '', subjectAr: '', body: '', bodyAr: '',
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export function EmailContent() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  // data
  const [settings, setSettings] = React.useState<EmailSettings | null>(null);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [outbox, setOutbox] = React.useState<OutboxMessage[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [gmailStatus, setGmailStatus] = React.useState<GmailStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  // navigation
  const [section, setSection] = React.useState<Section>('outbox');
  const [folder, setFolder] = React.useState<Folder>('all');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const search = usePageSearch('/email', 'Search mail & templates…', 'ابحث في البريد والقوالب…');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const autoInitRef = React.useRef(false);

  // compose
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [recipientQuery, setRecipientQuery] = React.useState('');
  const [recipientFocus, setRecipientFocus] = React.useState(false);
  const [composeTemplateId, setComposeTemplateId] = React.useState('');
  const [composeSubject, setComposeSubject] = React.useState('');
  const [composeBody, setComposeBody] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // template editor
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmailTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  // settings / delivery
  const [connectingGmail, setConnectingGmail] = React.useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [savingGmailCreds, setSavingGmailCreds] = React.useState(false);
  const [showClientSecret, setShowClientSecret] = React.useState(false);
  const [delivering, setDelivering] = React.useState(false);

  const templateVars = ['{{employeeName}}', '{{companyName}}', '{{date}}', '{{leaveStart}}', '{{leaveEnd}}', '{{days}}', '{{amount}}', '{{documentName}}'];

  /* ------------------------------ data ------------------------------ */

  const load = React.useCallback(async () => {
    setLoading(true);
    const [setRes, tplRes, gmailRes, outboxRes, empRes] = await Promise.all([
      emailService.getSettings(),
      emailService.getTemplates(),
      emailService.gmailStatus().catch(() => null),
      emailService.getOutbox().catch(() => null),
      employeeService.list({ pageSize: 500 }).catch(() => null),
    ]);
    if (setRes.success && setRes.data) setSettings(setRes.data);
    if (tplRes.success && tplRes.data) setTemplates(tplRes.data.data);
    if (gmailRes?.success && gmailRes.data) setGmailStatus(gmailRes.data);
    if (outboxRes?.success && outboxRes.data) setOutbox(outboxRes.data.data);
    if (empRes?.success && empRes.data) setEmployees(empRes.data.data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (autoInitRef.current) return;
    if (!loading && settings) {
      autoInitRef.current = true;
      setSection(settings.enabled ? 'outbox' : 'settings');
    }
  }, [loading, settings]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (result === 'connected') {
      addToast({ type: 'success', title: t('Google account connected', 'تم ربط حساب جوجل', language) });
    } else if (result) {
      addToast({ type: 'error', title: t('Gmail connection failed', 'فشل ربط Gmail', language) });
    }
    if (result) window.history.replaceState({}, '', window.location.pathname);
  }, [addToast, language]);

  const reloadOutbox = React.useCallback(async () => {
    const out = await emailService.getOutbox();
    if (out.success && out.data) setOutbox(out.data.data);
  }, []);

  /* ---------------------------- actions ----------------------------- */

  const handleDeliverOne = async (id: string) => {
    setDelivering(true);
    const res = await emailService.deliver(id);
    if (!res.success && res.error) addToast({ type: 'error', title: res.error });
    else addToast({ type: 'success', title: t('Message delivered', 'تم إرسال الرسالة', language) });
    await reloadOutbox();
    setDelivering(false);
  };

  const handleDeliverAll = async () => {
    setDelivering(true);
    const res = await emailService.deliver();
    if (res.success) {
      addToast({
        type: 'success',
        title: t('Delivery finished', 'اكتمل الإرسال', language),
        message: res.data ? `${res.data.delivered ?? 0} ${t('delivered', 'تم إرسالها', language)} / ${res.data.failed ?? 0} ${t('failed', 'فشلت', language)}` : undefined,
      });
    }
    await reloadOutbox();
    setDelivering(false);
  };

  const handleGmailConnect = async () => {
    setConnectingGmail(true);
    try {
      const res = await emailService.gmailAuth();
      if (res.success && res.data?.url) window.location.href = res.data.url;
      else addToast({ type: 'error', title: res.error || t('Gmail is not configured', 'Gmail غير مهيأ', language) });
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleGmailDisconnect = async () => {
    setDisconnectingGmail(true);
    try {
      const res = await emailService.gmailDisconnect();
      if (res.success) {
        setGmailStatus((prev) => (prev ? { ...prev, connected: false, accountEmail: undefined, accountName: undefined } : prev));
        addToast({ type: 'success', title: t('Google account disconnected', 'تم فصل حساب جوجل', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to disconnect', 'فشل الفصل', language) });
      }
    } finally {
      setDisconnectingGmail(false);
    }
  };

  const handleSaveGmailCreds = async () => {
    if (!settings) return;
    if (!settings.gmailClientId?.trim() || !settings.gmailClientSecret?.trim()) {
      addToast({ type: 'error', title: t('Client ID and Secret are required', 'معرّف العميل والسر مطلوبان', language) });
      return;
    }
    setSavingGmailCreds(true);
    try {
      const res = await emailService.updateSettings({
        gmailClientId: settings.gmailClientId.trim(),
        gmailClientSecret: settings.gmailClientSecret.trim(),
      });
      if (res.success && res.data) {
        setSettings(res.data);
        addToast({ type: 'success', title: t('Gmail credentials saved', 'تم حفظ بيانات Gmail', language) });
        if (gmailStatus) setGmailStatus({ ...gmailStatus, configured: true, authMissing: false, authUrl: undefined });
        load();
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save credentials', 'فشل حفظ البيانات', language) });
      }
    } finally {
      setSavingGmailCreds(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    const needsSmtp = settings.provider !== 'gmail';
    if ((needsSmtp && !settings.fromEmail) || (needsSmtp && !settings.smtpHost)) {
      addToast({ type: 'error', title: t('From email and SMTP host are required', 'البريد المرسل منه وخادم SMTP مطلوبان', language) });
      return;
    }
    if (settings.provider === 'gmail' && !settings.gmail?.connected) {
      addToast({ type: 'error', title: t('Connect a Google account before switching to Gmail', 'اربط حساب جوجل أولاً قبل التبديل إلى Gmail', language) });
      return;
    }
    setSavingSettings(true);
    try {
      const patch = Object.fromEntries(Object.entries(settings).filter(([key]) => key !== 'updatedAt'));
      const res = await emailService.updateSettings(patch);
      if (res.success && res.data) {
        setSettings(res.data);
        addToast({ type: 'success', title: t('Email settings saved', 'تم حفظ إعدادات البريد', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save settings', 'فشل حفظ الإعدادات', language) });
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const res = await emailService.sendTest();
      if (res.success) addToast({ type: 'success', title: res.data?.message || t('Test email sent', 'تم إرسال بريد تجريبي', language) });
      else addToast({ type: 'error', title: res.error || t('Failed to send test email', 'فشل إرسال البريد التجريبي', language) });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const emps = employees.filter((e) => selectedIds.includes(e.id));
      const res = await emailService.send({
        to: emps.map((e) => ({ name: e.fullName, email: e.email })),
        subject: composeSubject,
        body: composeBody,
        templateId: composeTemplateId || undefined,
      });
      if (res.success && res.data) {
        addToast({ type: 'success', title: t('Messages queued', 'تمت إضافة الرسائل للانتظار', language), message: res.data.message });
        setSelectedIds([]);
        setComposeSubject('');
        setComposeBody('');
        setComposeTemplateId('');
        setRecipientQuery('');
        setComposeOpen(false);
        setSection('outbox');
        setFolder('queued');
        await reloadOutbox();
      } else {
        addToast({ type: 'error', title: t('Failed to send', 'فشل الإرسال', language), message: res.error || '' });
      }
    } finally {
      setSending(false);
    }
  };

  const openCreateTemplate = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEditTemplate = (tpl: EmailTemplate) => {
    setEditing(tpl);
    setForm({
      name: tpl.name, nameAr: tpl.nameAr, category: tpl.category,
      subject: tpl.subject, subjectAr: tpl.subjectAr, body: tpl.body, bodyAr: tpl.bodyAr,
    });
    setEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      addToast({ type: 'error', title: t('Name, subject and body are required', 'الاسم والموضوع والمحتوى مطلوبة', language) });
      return;
    }
    setSavingTemplate(true);
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || form.name.trim(),
      category: form.category,
      subject: form.subject.trim(),
      subjectAr: form.subjectAr.trim() || form.subject.trim(),
      body: form.body,
      bodyAr: form.bodyAr.trim() || form.body,
      variables: templateVars,
      createdBy: user?.id || 'system',
    };
    const res = editing
      ? await emailService.updateTemplate(editing.id, payload)
      : await emailService.createTemplate(payload);
    try {
      if (res.success && res.data) {
        addToast({ type: 'success', title: t(editing ? 'Template updated' : 'Template created', editing ? 'تم تحديث القالب' : 'تم إنشاء القالب', language) });
        setEditorOpen(false);
        load();
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save template', 'فشل حفظ القالب', language) });
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const res = await emailService.deleteTemplate(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Template deleted', 'تم حذف القالب', language) });
      if (selectedTemplateId === id) setSelectedTemplateId(null);
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete template', 'فشل حذف القالب', language) });
    }
  };

  /* ---------------------------- derived ----------------------------- */

  const counts = React.useMemo(() => ({
    all: outbox.length,
    queued: outbox.filter((m) => m.status === 'queued').length,
    sent: outbox.filter((m) => m.status === 'sent').length,
    failed: outbox.filter((m) => m.status === 'failed').length,
  }), [outbox]);

  const filteredOutbox = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return outbox
      .filter((m) => (folder === 'all' ? true : m.status === folder))
      .filter((m) => !q || m.subject.toLowerCase().includes(q) || m.toEmail.toLowerCase().includes(q) || (m.toName || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [outbox, folder, search]);

  const groupedOutbox = React.useMemo(() => {
    const groups: { label: string; items: OutboxMessage[] }[] = [];
    for (const m of filteredOutbox) {
      const label = dateGroup(m.createdAt, language);
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(m);
      else groups.push({ label, items: [m] });
    }
    return groups;
  }, [filteredOutbox, language]);

  const filteredTemplates = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates
      .filter((tpl) => !categoryFilter || tpl.category === categoryFilter)
      .filter((tpl) => !q || tpl.name.toLowerCase().includes(q) || tpl.nameAr.toLowerCase().includes(q) || tpl.subject.toLowerCase().includes(q));
  }, [templates, categoryFilter, search]);

  const selectedMessage = outbox.find((m) => m.id === selectedMessageId) || null;
  const selectedTemplate = templates.find((tpl) => tpl.id === selectedTemplateId) || null;

  const recipientMatches = React.useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    const pool = employees.filter((e) => !selectedIds.includes(e.id));
    if (!q) return pool;
    return pool.filter((e) => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  }, [employees, recipientQuery, selectedIds]);

  const folders: { id: Folder; icon: React.ElementType; en: string; ar: string; count: number }[] = [
    { id: 'all', icon: Inbox, en: 'All Mail', ar: 'كل البريد', count: counts.all },
    { id: 'queued', icon: Clock, en: 'Queued', ar: 'بالانتظار', count: counts.queued },
    { id: 'sent', icon: Send, en: 'Sent', ar: 'المُرسلة', count: counts.sent },
    { id: 'failed', icon: AlertTriangle, en: 'Failed', ar: 'الفاشلة', count: counts.failed },
  ];

  const sectionTitle =
    section === 'settings'
      ? t('Settings', 'الإعدادات', language)
      : section === 'templates'
        ? t('Templates', 'القوالب', language)
        : (() => { const f = folders.find((x) => x.id === folder)!; return language === 'ar' ? f.ar : f.en; })();

  const showDetailMobile = (section === 'outbox' && !!selectedMessage) || (section === 'templates' && !!selectedTemplate);

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] overflow-hidden bg-white sm:-m-6" dir={dir}>
      {/* ======================= dark icon rail (Spark) ======================= */}
      <div className="hidden w-14 shrink-0 flex-col items-center gap-1 bg-[#1C2026] py-3 lg:flex">
        <button
          type="button"
          onClick={() => setSidebarOpen((s) => !s)}
          className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title={t('Toggle sidebar', 'إظهار/إخفاء الشريط', language)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => { setSection('outbox'); setSelectedTemplateId(null); }}
          className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            section === 'outbox' ? 'text-white' : 'text-gray-500 hover:bg-white/10 hover:text-gray-200'
          }`}
          title={t('Mail', 'البريد', language)}
        >
          {section === 'outbox' && <span className="absolute inset-x-2 inset-y-1 -z-0 rounded-lg" style={{ background: `${SPARK}33` }} />}
          <Inbox className="relative z-[1] h-5 w-5" />
          {counts.queued > 0 && (
            <span className="absolute -end-0.5 -top-0.5 z-[1] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: SPARK }}>
              {counts.queued}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setSection('templates'); setSelectedMessageId(null); }}
          className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            section === 'templates' ? 'text-white' : 'text-gray-500 hover:bg-white/10 hover:text-gray-200'
          }`}
          title={t('Templates', 'القوالب', language)}
        >
          {section === 'templates' && <span className="absolute inset-x-2 inset-y-1 rounded-lg" style={{ background: `${SPARK}33` }} />}
          <LayoutTemplate className="relative z-[1] h-5 w-5" />
        </button>

        <div className="mt-auto flex flex-col items-center gap-1">
          <ModuleSettingsMenu module={t('Email', 'البريد الإلكتروني', language)} />
          <button
            type="button"
            onClick={() => setSection('settings')}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              section === 'settings' ? 'text-white' : 'text-gray-500 hover:bg-white/10 hover:text-gray-200'
            }`}
            title={t('Settings', 'الإعدادات', language)}
          >
            {section === 'settings' && <span className="absolute inset-x-2 inset-y-1 rounded-lg" style={{ background: `${SPARK}33` }} />}
            <Settings className="relative z-[1] h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ===================== dark folder sidebar (Spark) ===================== */}
      {sidebarOpen && section !== 'settings' && (
        <div className="hidden w-52 shrink-0 flex-col bg-[#22262E] py-3 lg:flex">
          {section === 'outbox' ? (
            <nav className="space-y-px px-2">
              {folders.map((f) => {
                const active = folder === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { setFolder(f.id); setSelectedMessageId(null); }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <f.icon className="h-4 w-4" />
                    <span className="flex-1 truncate text-start">{language === 'ar' ? f.ar : f.en}</span>
                    {f.count > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? 'text-white' : 'text-gray-300'}`}
                        style={{ background: active ? SPARK : '#3A3F49' }}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          ) : (
            <nav className="space-y-px px-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('')}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  !categoryFilter ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="flex-1 truncate text-start">{t('All Templates', 'كل القوالب', language)}</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-gray-300" style={{ background: '#3A3F49' }}>
                  {templates.length}
                </span>
              </button>
              {templateCategories.map((c) => {
                const n = templates.filter((tpl) => tpl.category === c.value).length;
                if (n === 0) return null;
                const active = categoryFilter === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategoryFilter(active ? '' : c.value)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? SPARK : '#4B515C' }} />
                    <span className="flex-1 truncate text-start">{language === 'ar' ? c.ar : c.en}</span>
                    <span className="text-[10px] font-semibold text-gray-500">{n}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="mt-auto px-4 pb-1 pt-4">
            <div className="flex items-center gap-2 border-t border-white/5 pt-3">
              <span className={`h-1.5 w-1.5 rounded-full ${settings?.enabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              <p className="truncate text-[11px] text-gray-500">
                {settings?.enabled
                  ? gmailStatus?.connected && settings.provider === 'gmail'
                    ? gmailStatus.accountEmail
                    : settings.provider.toUpperCase()
                  : t('Delivery off', 'الإرسال معطّل', language)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================== light content =========================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* -------- Spark-style top toolbar -------- */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-100 px-3 sm:px-4">
          {showDetailMobile ? (
            <button
              type="button"
              onClick={() => { setSelectedMessageId(null); setSelectedTemplateId(null); }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-md lg:hidden" style={{ background: `${SPARK}1A`, color: SPARK }}>
              <Mail className="h-4 w-4" />
            </span>
          )}
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900">
            {sectionTitle}
            {section === 'outbox' && counts.all > 0 && (
              <span className="ms-2 text-xs font-normal text-gray-400">{filteredOutbox.length}</span>
            )}
          </h1>

          {/* mobile section switch */}
          <div className="flex items-center gap-0.5 lg:hidden">
            {([
              { id: 'outbox' as Section, icon: Inbox },
              { id: 'templates' as Section, icon: LayoutTemplate },
              { id: 'settings' as Section, icon: Settings },
            ]).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSection(s.id); setSelectedMessageId(null); setSelectedTemplateId(null); }}
                className={`rounded-lg p-2 transition-colors ${section === s.id ? '' : 'text-gray-400 hover:bg-gray-100'}`}
                style={section === s.id ? { color: SPARK, background: `${SPARK}14` } : undefined}
              >
                <s.icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>

          {section !== 'settings' && (
            <>
              {section === 'outbox' && counts.queued > 0 && (
                <button
                  type="button"
                  onClick={handleDeliverAll}
                  disabled={delivering}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                  title={t('Deliver all queued', 'إرسال كل المنتظر', language)}
                >
                  {delivering ? <RefreshCw className="h-[18px] w-[18px] animate-spin" /> : <SendHorizonal className="h-[18px] w-[18px]" />}
                </button>
              )}

              {section === 'templates' && (
                <button
                  type="button"
                  onClick={openCreateTemplate}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title={t('New Template', 'قالب جديد', language)}
                >
                  <Plus className="h-[18px] w-[18px]" />
                </button>
              )}

              {/* Spark's compose pencil */}
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="rounded-lg p-2 transition-colors hover:opacity-90"
                style={{ color: SPARK }}
                title={t('Compose', 'رسالة جديدة', language)}
              >
                <Pencil className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
        </div>

        {/* -------- content row -------- */}
        <div className="flex min-h-0 flex-1">
          {section === 'settings' ? (
            /* ============================ settings ============================ */
            <div className="min-w-0 flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6">
              <div className="mx-auto max-w-3xl space-y-5">
                {/* Gmail account */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${gmailStatus?.connected ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {gmailStatus?.connected
                          ? gmailStatus.accountName || gmailStatus.accountEmail
                          : t('No Google account connected', 'لا يوجد حساب جوجل مرتبط', language)}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {gmailStatus?.connected ? gmailStatus.accountEmail : t('Send email through Gmail using OAuth 2.0', 'أرسل البريد عبر Gmail باستخدام OAuth 2.0', language)}
                      </p>
                    </div>
                    {gmailStatus?.connected ? (
                      <Button variant="outline" onClick={handleGmailDisconnect} loading={disconnectingGmail}>
                        {t('Disconnect', 'فصل', language)}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGmailConnect}
                        disabled={connectingGmail}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: SPARK }}
                      >
                        <Chrome className="h-4 w-4" />
                        {t('Sign in with Google', 'الدخول عبر جوجل', language)}
                      </button>
                    )}
                  </div>

                  {gmailStatus?.authMissing && (
                    <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                      <p className="text-xs font-medium text-amber-700">
                        {t(
                          'Add your Google OAuth client credentials to enable Gmail delivery. Paste them below and they will be saved to the app.',
                          'أضف بيانات اعتماد OAuth من جوجل لتفعيل الإرسال عبر Gmail. الصقها أدناه وسيتم حفظها في التطبيق.',
                          language
                        )}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label={t('Client ID', 'معرّف العميل', language)}
                          value={settings?.gmailClientId || ''}
                          onChange={(e) => setSettings((prev) => (prev ? { ...prev, gmailClientId: e.target.value } : prev))}
                          placeholder="1234567890-xxxx.apps.googleusercontent.com"
                        />
                        <Input
                          label={t('Client Secret', 'السر الخاص بالعميل', language)}
                          type={showClientSecret ? 'text' : 'password'}
                          value={settings?.gmailClientSecret || ''}
                          onChange={(e) => setSettings((prev) => (prev ? { ...prev, gmailClientSecret: e.target.value } : prev))}
                          placeholder="GOCSPX-xxxx"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowClientSecret((s) => !s)}
                          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
                        >
                          {showClientSecret ? t('Hide secret', 'إخفاء السر', language) : t('Show secret', 'إظهار السر', language)}
                        </button>
                        <Button variant="outline" size="sm" onClick={handleSaveGmailCreds} loading={savingGmailCreds}>
                          <Save className="h-4 w-4" />
                          {t('Save Credentials', 'حفظ البيانات', language)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery settings */}
                {settings && (
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">{t('Delivery Provider', 'مزود الإرسال', language)}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSettings((prev) => (prev ? { ...prev, provider: 'smtp' } : prev))}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                            settings.provider === 'smtp' ? 'text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          style={settings.provider === 'smtp' ? { background: SPARK, borderColor: SPARK } : undefined}
                        >
                          SMTP
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!gmailStatus?.connected) { handleGmailConnect(); return; }
                            setSettings((prev) => (prev ? { ...prev, provider: 'gmail' } : prev));
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                            settings.provider === 'gmail' ? 'text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          style={settings.provider === 'gmail' ? { background: SPARK, borderColor: SPARK } : undefined}
                        >
                          <Chrome className="h-4 w-4" />
                          Gmail
                        </button>
                      </div>
                      {!gmailStatus?.connected && (
                        <p className="text-xs text-gray-400">
                          {t('Connect a Google account above to enable Gmail delivery.', 'اربط حساب جوجل أعلاه لتفعيل الإرسال عبر Gmail.', language)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label={t('From Name', 'اسم المرسل', language)} value={settings.fromName} onChange={(e) => setSettings({ ...settings, fromName: e.target.value })} />
                      <Input label={t('From Email', 'البريد المرسل منه', language)} value={settings.fromEmail} onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input label={t('Reply-To', 'الرد إلى', language)} value={settings.replyTo || ''} onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                      <Input label={t('SMTP Host', 'خادم SMTP', language)} value={settings.smtpHost} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} />
                      <Input label={t('Port', 'المنفذ', language)} type="number" value={String(settings.smtpPort)} onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label={t('SMTP Username', 'اسم مستخدم SMTP', language)} value={settings.smtpUser} onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })} />
                      <Input label={t('SMTP Password', 'كلمة مرور SMTP', language)} type="password" value={settings.smtpPassword || ''} onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">{t('Encryption', 'التشفير', language)}</label>
                        <select value={settings.encryption} onChange={(e) => setSettings({ ...settings, encryption: e.target.value as EmailSettings['encryption'] })} className={selectCls}>
                          <option value="none">{t('None', 'بدون', language)}</option>
                          <option value="tls">TLS</option>
                          <option value="ssl">SSL</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">{t('Status', 'الحالة', language)}</label>
                        <select value={settings.enabled ? '1' : '0'} onChange={(e) => setSettings({ ...settings, enabled: e.target.value === '1' })} className={selectCls}>
                          <option value="1">{t('Enabled', 'مفعّل', language)}</option>
                          <option value="0">{t('Disabled', 'معطّل', language)}</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                      <Button variant="outline" onClick={handleSendTest} loading={sendingTest}>
                        <SendHorizonal className="h-4 w-4" />
                        {t('Send Test', 'بريد تجريبي', language)}
                      </Button>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: SPARK }}
                      >
                        {savingSettings && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {t('Save Settings', 'حفظ الإعدادات', language)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ============================ list pane ============================ */}
              <div className={`min-w-0 flex-1 flex-col overflow-y-auto lg:max-w-[380px] lg:border-e lg:border-gray-100 ${showDetailMobile ? 'hidden lg:flex' : 'flex'}`}>
                {loading ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/5 animate-pulse rounded bg-gray-100" />
                          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : section === 'outbox' ? (
                  groupedOutbox.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                      <div className="mb-3 rounded-full p-5" style={{ background: `${SPARK}0D` }}>
                        <Inbox className="h-7 w-7" style={{ color: `${SPARK}66` }} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{t("You're all done here", 'كل شيء منجز هنا', language)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {t('Messages you send will appear in this folder.', 'الرسائل التي ترسلها ستظهر في هذا المجلد.', language)}
                      </p>
                    </div>
                  ) : (
                    groupedOutbox.map((group) => (
                      <div key={group.label}>
                        <p className="px-4 pb-1 pt-4 text-[12px] font-semibold text-gray-900">{group.label}</p>
                        {group.items.map((m) => {
                          const meta = statusMeta[m.status] || statusMeta.queued;
                          const active = m.id === selectedMessageId;
                          const displayName = m.toName || m.toEmail;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedMessageId(m.id)}
                              className="flex w-full items-center gap-3 px-4 py-2 text-start transition-colors"
                              style={active ? { background: '#EAF2FE' } : undefined}
                              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F7F8FA'; }}
                              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ''; }}
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarTone(displayName)}`}>
                                {initials(displayName)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-2">
                                  <span className="truncate text-[13px] font-semibold text-gray-900">{displayName}</span>
                                  <span className="shrink-0 text-[11px] text-gray-400">{listTime(m.createdAt, language)}</span>
                                </span>
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-[13px] text-gray-500">{m.subject || t('(no subject)', '(بدون موضوع)', language)}</span>
                                  <meta.icon className={`h-3.5 w-3.5 shrink-0 ${m.status === 'sent' ? 'text-emerald-500' : m.status === 'failed' ? 'text-red-500' : 'text-amber-500'}`} />
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                    <div className="mb-3 rounded-full p-5" style={{ background: `${SPARK}0D` }}>
                      <LayoutTemplate className="h-7 w-7" style={{ color: `${SPARK}66` }} />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {search || categoryFilter ? t('No templates match your filters.', 'لا توجد قوالب مطابقة لبحثك.', language) : t('No templates yet.', 'لا توجد قوالب بعد.', language)}
                    </p>
                    <button
                      type="button"
                      onClick={openCreateTemplate}
                      className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
                      style={{ background: SPARK }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('New Template', 'قالب جديد', language)}
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    {filteredTemplates.map((tpl) => {
                      const active = tpl.id === selectedTemplateId;
                      const name = language === 'ar' ? tpl.nameAr || tpl.name : tpl.name;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-start transition-colors"
                          style={active ? { background: '#EAF2FE' } : undefined}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F7F8FA'; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ''; }}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${avatarTone(name)}`}>
                            <Mail className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[13px] font-semibold text-gray-900">{name}</span>
                              <span className="shrink-0 text-[10px] font-medium text-gray-400">{categoryLabel(tpl.category, language)}</span>
                            </span>
                            <span className="block truncate text-[13px] text-gray-500">{language === 'ar' ? tpl.subjectAr || tpl.subject : tpl.subject}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* =========================== reading pane =========================== */}
              <div className={`min-w-0 flex-1 flex-col ${showDetailMobile ? 'flex' : 'hidden lg:flex'}`}>
                {section === 'outbox' && selectedMessage ? (
                  <div className="flex h-full flex-col overflow-y-auto">
                    <div className="px-6 pb-4 pt-6 sm:px-8">
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedMessage.subject || t('(no subject)', '(بدون موضوع)', language)}
                      </h2>
                      <div className="mt-4 flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(selectedMessage.toName || selectedMessage.toEmail)}`}>
                          {initials(selectedMessage.toName || selectedMessage.toEmail)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{selectedMessage.toName || selectedMessage.toEmail}</p>
                          <p className="truncate text-xs text-gray-400">
                            {t('To:', 'إلى:', language)} {selectedMessage.toEmail}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          {(() => {
                            const meta = statusMeta[selectedMessage.status] || statusMeta.queued;
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.classes}`}>
                                <meta.icon className="h-3.5 w-3.5" />
                                {language === 'ar' ? meta.ar : meta.en}
                              </span>
                            );
                          })()}
                          <p className="mt-1 text-[11px] text-gray-400">{formatDate(selectedMessage.createdAt, language)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-5 sm:px-8">
                      {(selectedMessage.status === 'queued' || selectedMessage.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => handleDeliverOne(selectedMessage.id)}
                          disabled={delivering}
                          className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: SPARK }}
                        >
                          {delivering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                          {selectedMessage.status === 'failed' ? t('Retry delivery', 'إعادة المحاولة', language) : t('Send now', 'أرسل الآن', language)}
                        </button>
                      )}
                      {selectedMessage.status === 'sent' && (
                        <p className="flex items-center gap-2 text-sm text-gray-400">
                          <CheckCheck className="h-4 w-4 text-emerald-500" />
                          {t('This message was delivered.', 'تم إرسال هذه الرسالة.', language)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : section === 'templates' && selectedTemplate ? (
                  <div className="flex h-full flex-col overflow-y-auto">
                    <div className="px-6 pb-4 pt-6 sm:px-8">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 text-xl font-bold text-gray-900">
                          {language === 'ar' ? selectedTemplate.nameAr || selectedTemplate.name : selectedTemplate.name}
                        </h2>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTemplate(selectedTemplate)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            title={t('Edit', 'تعديل', language)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title={t('Delete', 'حذف', language)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setComposeTemplateId(selectedTemplate.id);
                              setComposeSubject(selectedTemplate.subject);
                              setComposeBody(selectedTemplate.body);
                              setComposeOpen(true);
                            }}
                            className="ms-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: SPARK }}
                          >
                            <SendHorizonal className="h-3.5 w-3.5" />
                            {t('Use template', 'استخدام القالب', language)}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: `${SPARK}14`, color: SPARK }}>
                          {categoryLabel(selectedTemplate.category, language)}
                        </span>
                        <span>{formatDate(selectedTemplate.createdAt, language)}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-5 sm:px-8">
                      <p className="text-sm font-semibold text-gray-900">
                        {language === 'ar' ? selectedTemplate.subjectAr || selectedTemplate.subject : selectedTemplate.subject}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {language === 'ar' ? selectedTemplate.bodyAr || selectedTemplate.body : selectedTemplate.body}
                      </p>
                      {selectedTemplate.variables.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4">
                          {selectedTemplate.variables.map((v) => (
                            <span key={v} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="hidden h-full flex-col items-center justify-center p-8 text-center lg:flex">
                    <div className="mb-4 rounded-full p-6" style={{ background: `${SPARK}0A` }}>
                      {section === 'outbox' ? (
                        <Mail className="h-8 w-8" style={{ color: `${SPARK}59` }} />
                      ) : (
                        <LayoutTemplate className="h-8 w-8" style={{ color: `${SPARK}59` }} />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {section === 'outbox'
                        ? t('Select a message to read', 'اختر رسالة لقراءتها', language)
                        : t('Select a template to preview', 'اختر قالبًا لمعاينته', language)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* mobile compose FAB */}
      {!composeOpen && section !== 'settings' && !showDetailMobile && (
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="fixed bottom-20 end-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-95 lg:hidden"
          style={{ background: SPARK, boxShadow: `0 12px 28px ${SPARK}59` }}
          aria-label={t('Compose', 'رسالة جديدة', language)}
        >
          <Pencil className="h-5 w-5" />
        </button>
      )}

      {/* ===================== Spark-style compose sheet ===================== */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 p-0 sm:items-center sm:p-6" dir={dir}>
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-xl">
            {/* title bar */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
              <h2 className="flex-1 text-sm font-semibold text-gray-900">{t('New Message', 'رسالة جديدة', language)}</h2>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('Close', 'إغلاق', language)}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* To — hairline row like Spark */}
              <div className="border-b border-gray-100 px-5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="me-1 text-[13px] text-gray-400">{t('To:', 'إلى:', language)}</span>
                  {employees.filter((e) => selectedIds.includes(e.id)).map((e) => (
                    <span key={e.id} className="inline-flex items-center gap-1 rounded-full py-0.5 pe-1 ps-2.5 text-xs font-medium" style={{ background: `${SPARK}14`, color: SPARK }}>
                      {e.fullName}
                      <button
                        type="button"
                        onClick={() => setSelectedIds((prev) => prev.filter((i) => i !== e.id))}
                        className="rounded-full p-0.5 hover:bg-black/10"
                        aria-label={t('Remove', 'إزالة', language)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    onFocus={() => setRecipientFocus(true)}
                    onBlur={() => setTimeout(() => setRecipientFocus(false), 150)}
                    placeholder={selectedIds.length === 0 ? t('Search employees...', 'ابحث عن موظفين...', language) : ''}
                    className="min-w-28 flex-1 border-0 bg-transparent py-1 text-[13px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
                  />
                  {selectedIds.length > 0 && employees.length > selectedIds.length && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds(employees.map((e) => e.id))}
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
                    >
                      {t('Select all', 'تحديد الكل', language)}
                    </button>
                  )}
                </div>
                {(recipientFocus || recipientQuery) && recipientMatches.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-100 shadow-sm">
                    {recipientMatches.slice(0, 20).map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSelectedIds((prev) => [...prev, emp.id]); setRecipientQuery(''); }}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-start hover:bg-gray-50"
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarTone(emp.fullName)}`}>
                          {initials(emp.fullName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-gray-800">{emp.fullName}</span>
                        </span>
                        <span className="shrink-0 truncate text-[11px] text-gray-400">{emp.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject — hairline row */}
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-2.5">
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder={t('Subject', 'الموضوع', language)}
                  className="flex-1 border-0 bg-transparent py-1 text-[13px] font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
                />
                <select
                  value={composeTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setComposeTemplateId(id);
                    const tpl = templates.find((x) => x.id === id);
                    if (tpl) {
                      setComposeSubject(tpl.subject);
                      setComposeBody(tpl.body);
                    }
                  }}
                  className="max-w-40 shrink-0 rounded-md border-0 bg-gray-100 px-2 py-1 text-[11px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3478F6]/40"
                >
                  <option value="">{t('Template…', 'قالب…', language)}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {language === 'ar' ? tpl.nameAr || tpl.name : tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Body — borderless like Spark */}
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={10}
                placeholder={t('Write your message...', 'اكتب رسالتك...', language)}
                className="block w-full resize-none border-0 bg-transparent px-5 py-3 text-[13px] leading-relaxed text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
              />
            </div>

            {/* bottom bar */}
            <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || selectedIds.length === 0 || !composeBody.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: SPARK }}
              >
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('Send', 'إرسال', language)}
                {selectedIds.length > 0 && <span className="opacity-70">· {selectedIds.length}</span>}
              </button>
              <p className="flex-1 truncate text-end text-[11px] text-gray-300">
                {settings?.provider === 'gmail' && settings.gmail?.connected
                  ? t('via Gmail', 'عبر Gmail', language)
                  : t('queued for delivery', 'تُضاف لقائمة الانتظار', language)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================== template editor ========================= */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 p-0 sm:items-center sm:p-6" dir={dir}>
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
              <h2 className="flex-1 text-sm font-semibold text-gray-900">
                {t(editing ? 'Edit Template' : 'New Template', editing ? 'تعديل القالب' : 'قالب جديد', language)}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('Close', 'إغلاق', language)}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label={t('Template Name (English)', 'اسم القالب (إنجليزي)', language)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label={t('Template Name (Arabic)', 'اسم القالب (عربي)', language)} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EmailTemplateCategory })} className={selectCls}>
                    {templateCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {language === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label={t('Subject (English)', 'الموضوع (إنجليزي)', language)} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <Input label={t('Subject (Arabic)', 'الموضوع (عربي)', language)} value={form.subjectAr} onChange={(e) => setForm({ ...form, subjectAr: e.target.value })} />

              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-1">
                  <span className="me-1 text-xs text-gray-400">{t('Insert:', 'إدراج:', language)}</span>
                  {templateVars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, body: form.body + ' ' + v })}
                      className="rounded-md px-2 py-1 font-mono text-xs transition-colors hover:opacity-80"
                      style={{ background: `${SPARK}0F`, color: SPARK }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">{t('Body (English)', 'المحتوى (إنجليزي)', language)}</label>
                    <textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      rows={6}
                      placeholder={t('Dear {{employeeName}}, ...', 'عزيزي {{employeeName}}، ...', language)}
                      className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">{t('Body (Arabic)', 'المحتوى (عربي)', language)}</label>
                    <textarea
                      value={form.bodyAr}
                      onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
                      rows={6}
                      placeholder={t('Optional', 'اختياري', language)}
                      className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/40"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: SPARK }}
              >
                {savingTemplate && <RefreshCw className="h-4 w-4 animate-spin" />}
                {t(editing ? 'Save Changes' : 'Create Template', editing ? 'حفظ التغييرات' : 'إنشاء قالب', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
