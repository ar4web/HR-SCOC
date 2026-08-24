'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { emailService, GmailStatus } from '@/modules/email/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { EmailTemplate, EmailSettings, EmailTemplateCategory, Employee } from '@/types';
import { employeeService } from '@/modules/employee-management/service';
import { t, formatDate } from '@/lib/utils';
import { Mail, Plus, Trash2, Pencil, Send, Settings, LayoutTemplate, Search, Chrome, Inbox, SendHorizonal, Users, Save } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

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

function EmailTabButton({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 data-[state=active]:border-primary data-[state=active]:text-primary"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Tabs.Trigger>
  );
}

export function EmailContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = React.useState('settings');
  const tabTouchedRef = React.useRef(false);
  const autoInitRef = React.useRef(false);

  const handleTabChange = (value: string) => {
    tabTouchedRef.current = true;
    setActiveTab(value);
  };
  const [settings, setSettings] = React.useState<EmailSettings | null>(null);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [outbox, setOutbox] = React.useState<{ id: string; toEmail: string; toName?: string; subject: string; status: string; createdAt: string }[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [composeTemplateId, setComposeTemplateId] = React.useState('');
  const [composeSubject, setComposeSubject] = React.useState('');
  const [composeBody, setComposeBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [gmailStatus, setGmailStatus] = React.useState<GmailStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [connectingGmail, setConnectingGmail] = React.useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [savingGmailCreds, setSavingGmailCreds] = React.useState(false);
  const [showClientSecret, setShowClientSecret] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<EmailTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({
    name: '',
    nameAr: '',
    category: 'welcome' as EmailTemplateCategory,
    subject: '',
    subjectAr: '',
    body: '',
    bodyAr: '',
  });

  const templateVars = ['{{employeeName}}', '{{companyName}}', '{{date}}', '{{leaveStart}}', '{{leaveEnd}}', '{{days}}', '{{amount}}', '{{documentName}}'];

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const queueLoad = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 250);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    filterRef.current = { ...filterRef.current, search: value };
    queueLoad();
  };

  const handleCategory = (value: string) => {
    setCategoryFilter(value);
    filterRef.current = { ...filterRef.current, category: value };
    queueLoad();
  };

  const filterRef = React.useRef<{ category: string; search: string }>({ category: '', search: '' });

  const load = React.useCallback(async () => {
    setLoading(true);
    const { category, search: q } = filterRef.current;
    const [setRes, tplRes, gmailRes, outboxRes, empRes] = await Promise.all([
      emailService.getSettings(),
      emailService.getTemplates({ category: category || undefined, search: q || undefined }),
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

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (autoInitRef.current) return;
    if (!loading && settings) {
      autoInitRef.current = true;
      setActiveTab(settings.enabled ? 'compose' : 'settings');
    }
  }, [loading, settings]);

  const [delivering, setDelivering] = React.useState(false);

  const reloadOutbox = React.useCallback(async () => {
    const out = await emailService.getOutbox();
    if (out.success && out.data) setOutbox(out.data.data);
  }, []);

  const handleDeliverOne = async (id: string) => {
    setDelivering(true);
    const res = await emailService.deliver(id);
    if (!res.success && res.error) {
      addToast({ type: 'error', title: res.error });
    } else {
      addToast({ type: 'success', title: t('Message delivered', 'تم إرسال الرسالة', language) });
    }
    await reloadOutbox();
    setDelivering(false);
  };

  const handleDeliverAll = async () => {
    setDelivering(true);
    const res = await emailService.deliver();
    if (res.success) {
      addToast({
        type: 'success',
        title: t(
          `Delivered, failed`,
          'تم الإرسال',
          language
        ),
        message: res.data ? `${res.data.delivered ?? 0} ${t('delivered', 'تم إرسالها', language)} / ${res.data.failed ?? 0} ${t('failed', 'فشلت', language)}` : undefined,
      });
    }
    await reloadOutbox();
    setDelivering(false);
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (result === 'connected') {
      addToast({
        type: 'success',
        title: t(
          'Google account connected',
          'تم ربط حساب جوجل',
          language
        ),
      });
    } else if (result) {
      addToast({ type: 'error', title: t('Gmail connection failed', 'فشل ربط Gmail', language) });
    }
    if (result) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [addToast, language]);

  const handleGmailConnect = async () => {
    setConnectingGmail(true);
    try {
      const res = await emailService.gmailAuth();
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        addToast({ type: 'error', title: res.error || t('Gmail is not configured', 'Gmail غير مهيأ', language) });
      }
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

  const setProvider = (provider: EmailSettings['provider']) => {
    setSettings((prev) => (prev ? { ...prev, provider } : prev));
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
        gmailStatus && setGmailStatus({ ...gmailStatus, configured: true, authMissing: false, authUrl: undefined });
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
      const patch = Object.fromEntries(
        Object.entries(settings).filter(([key]) => key !== 'updatedAt')
      );
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
      if (res.success) {
        addToast({ type: 'success', title: res.data?.message || t('Test email sent', 'تم إرسال بريد تجريبي', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to send test email', 'فشل إرسال البريد التجريبي', language) });
      }
    } finally {
      setSendingTest(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', nameAr: '', category: 'welcome', subject: '', subjectAr: '', body: '', bodyAr: '' });
    setShowForm(true);
  };

  const openEdit = (tpl: EmailTemplate) => {
    setEditing(tpl);
    setForm({
      name: tpl.name,
      nameAr: tpl.nameAr,
      category: tpl.category,
      subject: tpl.subject,
      subjectAr: tpl.subjectAr,
      body: tpl.body,
      bodyAr: tpl.bodyAr,
    });
    setShowForm(true);
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
        addToast({
          type: 'success',
          title: t(editing ? 'Template updated' : 'Template created', editing ? 'تم تحديث القالب' : 'تم إنشاء القالب', language),
        });
        setShowForm(false);
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
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete template', 'فشل حذف القالب', language) });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{t('Email Center', 'مركز البريد الإلكتروني', language)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Send email + manage prebuilt message templates in one view', 'أرسل البريد وأدر قوالب الرسائل الجاهزة في واجهة واحدة', language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                settings.enabled
                  ? settings.provider === 'gmail'
                    ? 'bg-success/10 text-success'
                    : 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${settings.enabled ? 'bg-current' : 'bg-gray-400'}`} />
              {settings.enabled
                ? t(settings.provider === 'gmail' ? 'Gmail active' : 'SMTP active', settings.provider === 'gmail' ? 'Gmail مفعّل' : 'SMTP مفعّل', language)
                : t('Disabled', 'معطّل', language)}
            </span>
          )}
          {gmailStatus?.connected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium">
              <Mail className="h-3.5 w-3.5" />
              {gmailStatus.accountEmail}
            </span>
          )}
          <ModuleSettingsMenu module={t('Email', 'البريد الإلكتروني', language)} />
        </div>
      </div>
      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="flex flex-wrap items-center gap-1 border-b border-gray-200">
          <EmailTabButton value="settings" icon={Settings} label={t('Settings', 'الإعدادات', language)} />
          <EmailTabButton value="compose" icon={SendHorizonal} label={t('Compose', 'إنشاء', language)} />
          <EmailTabButton value="outbox" icon={Inbox} label={t('Outbox', 'صادر', language)} />
          <EmailTabButton value="templates" icon={LayoutTemplate} label={t('Templates', 'القوالب', language)} />
        </Tabs.List>

        <Tabs.Content value="settings" className="mt-6">
        <div className="flex flex-col min-w-0">
          {loading ? (
            <Card>
              <CardBody>
                <TableSkeleton rows={4} cols={2} />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex items-center gap-3">
                  <Chrome className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('Gmail Integration', 'ربط Gmail', language)}</h2>
                  {gmailStatus?.connected && (
                    <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2.5 py-0.5 text-xs font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {t('Connected', 'متصل', language)}
                    </span>
                  )}
                </CardHeader>
                <CardBody className="space-y-4">
                  {!gmailStatus ? (
                    <div className="animate-pulse h-10 w-full rounded-lg bg-gray-100" />
                  ) : (
                    <>
                      <div className="rounded-xl bg-white shadow-card p-4 flex flex-wrap items-center gap-3 transition-shadow hover:shadow-md">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            gmailStatus.connected ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {gmailStatus.connected
                              ? gmailStatus.accountName || gmailStatus.accountEmail
                              : t('No Google account connected', 'لا يوجد حساب جوجل مرتبط', language)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {gmailStatus.connected
                              ? gmailStatus.accountEmail
                              : t('Send email through Gmail using OAuth 2.0', 'أرسل البريد عبر Gmail باستخدام OAuth 2.0', language)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {gmailStatus.connected ? (
                            <Button variant="outline" onClick={handleGmailDisconnect} loading={disconnectingGmail}>
                              {t('Disconnect', 'فصل', language)}
                            </Button>
                          ) : (
                            <Button onClick={handleGmailConnect} loading={connectingGmail} title={t('Sign in with Google', 'تسجيل الدخول عبر جوجل', language)} aria-label={t('Sign in with Google', 'تسجيل الدخول عبر جوجل', language)}>
                              <Chrome className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {gmailStatus.authMissing && (
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
                          <p className="text-xs font-medium text-warning">
                            {t(
                              'Add your Google OAuth client credentials to enable Gmail delivery. Paste them below and they will be saved to the app (no env restart needed).',
                              'أضف بيانات اعتماد OAuth من جوجل لتفعيل الإرسال عبر Gmail. الصقها أدناه وسيتم حفظها في التطبيق (بدون إعادة تشغيل).',
                              language
                            )}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <button
                              type="button"
                              onClick={() => setShowClientSecret((s) => !s)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                            >
                              {showClientSecret
                                ? t('Hide secret', 'إخفاء السر', language)
                                : t('Show secret', 'إظهار السر', language)}
                            </button>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={handleSaveGmailCreds} loading={savingGmailCreds} title={t('Save Credentials', 'حفظ البيانات', language)} aria-label={t('Save Credentials', 'حفظ البيانات', language)}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {(settings?.gmailClientId || settings?.gmailClientSecret) && (
                            <p className="text-xs text-success">
                              {t('Credentials saved. You can now sign in with Google above.', 'تم حفظ البيانات. يمكنك الآن تسجيل الدخول عبر جوجل بالأعلى.', language)}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>

              <div className="flex-1" />

              <div className="lg:sticky lg:bottom-0 mt-6 lg:mt-0">
              <Card>
                <CardHeader className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('Delivery Settings', 'إعدادات الإرسال', language)}</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  {settings && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('Delivery Provider', 'مزود الإرسال', language)}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setProvider('smtp')}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                              settings.provider === 'smtp'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {t('SMTP', 'SMTP', language)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!gmailStatus?.connected) {
                                handleGmailConnect();
                                return;
                              }
                              setProvider('gmail');
                            }}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-center transition flex items-center justify-center gap-1.5 ${
                              settings.provider === 'gmail'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <Chrome className="h-4 w-4" />
                            {t('Gmail', 'Gmail', language)}
                          </button>
                        </div>
                        {settings && !gmailStatus?.connected && (
                          <p className="text-xs text-gray-400">
                            {t('Connect a Google account above to enable Gmail delivery.', 'اربط حساب جوجل أعلاه لتفعيل الإرسال عبر Gmail.', language)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={t('From Name', 'اسم المرسل', language)}
                          value={settings.fromName}
                          onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                        />
                        <Input
                          label={t('From Email', 'البريد المرسل منه', language)}
                          value={settings.fromEmail}
                          onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={t('Reply-To', 'الرد إلى', language)}
                          value={settings.replyTo || ''}
                          onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                          placeholder={t('Optional', 'اختياري', language)}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label={t('SMTP Host', 'خادم SMTP', language)}
                            value={settings.smtpHost}
                            onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                          />
                          <Input
                            label={t('Port', 'المنفذ', language)}
                            type="number"
                            value={String(settings.smtpPort)}
                            onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={t('SMTP Username', 'اسم مستخدم SMTP', language)}
                          value={settings.smtpUser}
                          onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                        />
                        <Input
                          label={t('SMTP Password', 'كلمة مرور SMTP', language)}
                          type="password"
                          value={settings.smtpPassword || ''}
                          onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-gray-700">{t('Encryption', 'التشفير', language)}</label>
                          <select
                            value={settings.encryption}
                            onChange={(e) => setSettings({ ...settings, encryption: e.target.value as EmailSettings['encryption'] })}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="none">{t('None', 'بدون', language)}</option>
                            <option value="tls">TLS</option>
                            <option value="ssl">SSL</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-gray-700">{t('Status', 'الحالة', language)}</label>
                          <select
                            value={settings.enabled ? '1' : '0'}
                            onChange={(e) => setSettings({ ...settings, enabled: e.target.value === '1' })}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="1">{t('Enabled', 'مفعّل', language)}</option>
                            <option value="0">{t('Disabled', 'معطّل', language)}</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-100">
                        <Button variant="outline" onClick={handleSendTest} loading={sendingTest} title={t('Send Test Email', 'إرسال بريد تجريبي', language)} aria-label={t('Send Test Email', 'إرسال بريد تجريبي', language)}>
                          <SendHorizonal className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSaveSettings} loading={savingSettings}>
                          {t('Save Settings', 'حفظ الإعدادات', language)}
                        </Button>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
              </div>
            </>
          )}
        </div>
        </Tabs.Content>

        <Tabs.Content value="compose" className="mt-6">
          <Card>
            <CardHeader className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-success/10 p-2 text-success">
                  <SendHorizonal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('Compose & Send', 'إنشاء وإرسال', language)}</h2>
                  <p className="text-xs text-gray-500">
                    {t('Send to employees using a template or a custom message', 'أرسل للموظفين باستخدام قالب أو رسالة مخصصة', language)}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {settings?.provider === 'gmail' && settings.gmail?.connected
                  ? t('Delivering via connected Gmail', 'يتم الإرسال عبر حساب Gmail المرتبط', language)
                  : t('Messages are queued — connect Gmail or configure SMTP for live delivery', 'رسائل قيد الانتظار — اربط Gmail أو اضبط SMTP للإرسال المباشر', language)}
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {t('Recipients', 'المستلمون', language)}
                    </label>
                    {employees.length === 0 ? (
                      <p className="text-sm text-gray-400">{t('No employees available', 'لا يوجد موظفون متاحون', language)}</p>
                    ) : (
                      <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                        {employees.map((emp) => {
                          const checked = selectedIds.includes(emp.id);
                          return (
                            <label key={emp.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-primary/5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedIds((prev) => (checked ? prev.filter((i) => i !== emp.id) : [...prev, emp.id]))
                                }
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-gray-700">{emp.fullName}</span>
                                <span className="block truncate text-xs text-gray-400">{emp.email}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-gray-400">
                      {selectedIds.length > 0 ? `${selectedIds.length} ${t('selected', 'محدد', language)}` : t('Select one or more employees', 'اختر موظفاً أو أكثر', language)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      {t('Template (optional)', 'قالب (اختياري)', language)}
                    </label>
                    <select
                      value={composeTemplateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setComposeTemplateId(id);
                        const tpl = templates.find((t) => t.id === id);
                        if (tpl) {
                          setComposeSubject(tpl.subject);
                          setComposeBody(tpl.body);
                        }
                      }}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">{t('No template — write your own', 'بدون قالب — اكتب بنفسك', language)}</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {language === 'ar' ? tpl.nameAr || tpl.name : tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">{t('Subject', 'الموضوع', language)}</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder={t('Email subject...', 'موضوع البريد...', language)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">{t('Message', 'الرسالة', language)}</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      rows={7}
                      placeholder={t('Message body...', 'محتوى الرسالة...', language)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={async () => {
                        setSending(true);
                        try {
                          const ids = selectedIds;
                          const emps = employees.filter((e) => ids.includes(e.id));
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
                            const out = await emailService.getOutbox();
                            if (out.success && out.data) setOutbox(out.data.data);
                          } else {
                            addToast({ type: 'error', title: t('Failed to send', 'فشل الإرسال', language), message: res.error || '' });
                          }
                        } finally {
                          setSending(false);
                        }
                      }}
                      loading={sending}
                      disabled={selectedIds.length === 0 || !composeBody.trim()}
                      title={t('Send', 'إرسال', language)}
                      aria-label={t('Send', 'إرسال', language)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    {t('Recipients in this send', 'المستلمون في هذا الإرسال', language)}
                  </p>
                  {selectedIds.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('No recipients selected yet', 'لم يتم اختيار مستلمين بعد', language)}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {employees.filter((e) => selectedIds.includes(e.id)).map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <Users className="h-3 w-3" />
                          {e.fullName}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex-1 rounded-xl bg-gray-50/60 p-4">
                    <p className="text-xs font-semibold text-gray-500">{t('Preview', 'معاينة', language)}</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{composeSubject || t('No subject', 'بدون موضوع', language)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{composeBody || t('Empty message body', 'رسالة فارغة', language)}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
          </Tabs.Content>

          <Tabs.Content value="outbox" className="mt-6">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-info/10 p-2 text-info">
                  <Inbox className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="text-lg font-semibold">{t('Outbox', 'صادر', language)}</h2>
                  <p className="text-xs text-gray-500">{outbox.length} {t('messages', 'رسائل', language)}</p>
                </div>
                {outbox.some((m) => m.status === 'queued') && (
                  <Button variant="outline" size="sm" onClick={handleDeliverAll} loading={delivering} title={t('Deliver queued', 'إرسال المنتظر', language)} aria-label={t('Deliver queued', 'إرسال المنتظر', language)}>
                    <SendHorizonal className="h-4 w-4" />
                  </Button>
                )}
              </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {outbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Inbox className="h-6 w-6 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">{t('No messages sent yet', 'لم يتم إرسال رسائل بعد', language)}</p>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin" role="region" aria-label={t('Email templates table', 'جدول قوالب البريد', language)} tabIndex={0}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left rtl:text-right text-xs text-gray-400">
                        <th className="px-6 py-3 font-medium">{t('Date', 'التاريخ', language)}</th>
                        <th className="px-6 py-3 font-medium">{t('Recipient', 'المستلم', language)}</th>
                        <th className="px-6 py-3 font-medium">{t('Subject', 'الموضوع', language)}</th>
                        <th className="px-6 py-3 font-medium">{t('Status', 'الحالة', language)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outbox.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(m.createdAt, language)}</td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            <span className="font-medium">{m.toName || m.toEmail}</span>
                            <span className="block text-xs text-gray-400">{m.toEmail}</span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 truncate max-w-60">{m.subject}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {m.status === 'queued' ? (
                                <>
                                  <span className="inline-block rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">Queued</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeliverOne(m.id)}
                                    disabled={delivering}
                                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                                  >
                                    {t('Send now', 'أرسل الآن', language)}
                                  </button>
                                </>
                              ) : m.status === 'sent' ? (
                                <span className="inline-block rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Sent</span>
                              ) : (
                                <>
                                  <span className="inline-block rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error">Failed</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeliverOne(m.id)}
                                    disabled={delivering}
                                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                                  >
                                    {t('Retry', 'إعادة المحاولة', language)}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
          </Tabs.Content>

          <Tabs.Content value="templates" className="mt-6">
          {showForm && (
            <Card>
              <CardHeader className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${editing ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    {t(editing ? 'Edit Template' : 'Create Template', editing ? 'تعديل القالب' : 'إنشاء قالب', language)}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <span className="text-xs text-gray-400 me-1 self-center">{t('Insert:', 'إدراج:', language)}</span>
                  {templateVars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, body: form.body + ' ' + v })}
                      className="px-2 py-1 rounded-md bg-secondary/5 text-secondary text-xs font-mono hover:bg-secondary/10 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('Template Name (English)', 'اسم القالب (إنجليزي)', language)}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label={t('Template Name (Arabic)', 'اسم القالب (عربي)', language)}
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as EmailTemplateCategory })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {templateCategories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {language === 'ar' ? c.ar : c.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label={t('Subject (English)', 'الموضوع (إنجليزي)', language)}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <Input
                  label={t('Subject (Arabic)', 'الموضوع (عربي)', language)}
                  value={form.subjectAr}
                  onChange={(e) => setForm({ ...form, subjectAr: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Body (English)', 'المحتوى (إنجليزي)', language)}
                    </label>
                    <textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      rows={6}
                      placeholder={t('Dear {{employeeName}}, ...', 'عزيزي {{employeeName}}، ...', language)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Body (Arabic)', 'المحتوى (عربي)', language)}
                    </label>
                    <textarea
                      value={form.bodyAr}
                      onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
                      rows={6}
                      placeholder={t('Optional', 'اختياري', language)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    {t('Cancel', 'إلغاء', language)}
                  </Button>
                  <Button onClick={handleSaveTemplate} loading={savingTemplate}>
                    {t(editing ? 'Save Changes' : 'Create Template', editing ? 'حفظ التغييرات' : 'إنشاء قالب', language)}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('Templates', 'القوالب', language)}</h2>
                  <p className="text-xs text-gray-500">
                    {templates.length} {t('available', 'متاح', language)}
                  </p>
                </div>
              </div>
              <div className="flex-1" />
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('Search templates...', 'ابحث عن قوالب...', language)}
                  className="block w-full sm:w-52 rounded-lg border border-gray-300 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => handleCategory(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('All Categories', 'كل التصنيفات', language)}</option>
                {templateCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {language === 'ar' ? c.ar : c.en}
                  </option>
                ))}
              </select>
              <Button onClick={openCreate} title={t('New Template', 'قالب جديد', language)} aria-label={t('New Template', 'قالب جديد', language)}>          <Plus className="h-4 w-4" />
        </Button>
        
            </CardHeader>
            <CardBody>
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-gray-100 p-4 mb-3">
                    <Mail className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {search || categoryFilter
                      ? t('No templates match your filters.', 'لا توجد قوالب مطابقة لبحثك.', language)
                      : t('No templates yet.', 'لا توجد قوالب بعد.', language)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">
                    {t(
                      search || categoryFilter ? 'Try adjusting your search or filter.' : 'Create your first reusable email template.',
                      search || categoryFilter ? 'جرّب تعديل البحث أو التصفية.' : 'أنشئ أول قالب بريد قابل لإعادة الاستخدام.',
                      language
                    )}
                  </p>
                  <Button variant="outline" onClick={openCreate} title={t('New Template', 'قالب جديد', language)} aria-label={t('New Template', 'قالب جديد', language)}>          <Plus className="h-4 w-4" />
        </Button>
        
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 min-w-[560px] lg:min-w-0">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Template', 'القالب', language)}
                        </th>
                        <th className="px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Content', 'المحتوى', language)}
                        </th>
                        <th className="hidden md:table-cell px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Variables', 'المتغيرات', language)}
                        </th>
                        <th className="px-6 py-3.5 align-middle text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Actions', 'الإجراءات', language)}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {templates.map((tpl) => (
                        <tr key={tpl.id} className="group hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  editing?.id === tpl.id
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-primary/5 text-primary group-hover:bg-primary/10'
                                }`}
                              >
                                <Mail className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 break-words">
                                  {language === 'ar' ? tpl.nameAr || tpl.name : tpl.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/5 text-secondary">
                                    {categoryLabel(tpl.category, language)}
                                  </span>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(tpl.createdAt, language)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-middle min-w-0">
                            <p className="truncate text-sm font-medium text-gray-700">{language === 'ar' ? tpl.subjectAr || tpl.subject : tpl.subject}</p>
                            <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words font-mono text-xs text-gray-500">
                              {language === 'ar' ? tpl.bodyAr || tpl.body : tpl.body}
                            </p>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 align-middle">
                            <div className="flex max-w-56 flex-wrap gap-1">
                              {tpl.variables.length > 0 ? (
                                tpl.variables.map((v) => (
                                  <span key={v} className="px-1.5 py-0.5 rounded bg-secondary/5 text-secondary text-[10px] font-mono">
                                    {v}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-middle text-end whitespace-nowrap">
                            <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(tpl)}
                                className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                                title={t('Edit', 'تعديل', language)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
                                title={t('Delete', 'حذف', language)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
          </Tabs.Content>
        </Tabs.Root>
    </div>
  );
}
