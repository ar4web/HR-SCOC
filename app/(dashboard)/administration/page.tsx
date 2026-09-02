'use client';

/**
 * Administration — modern redesign.
 *
 * - Slim inline stat bar (users / admins / employees / audit events).
 * - Segmented Users | Audit tabs with live counts + instant search.
 * - Users: avatar-led borderless rows, role changed via a proper menu with
 *   icons + descriptions (no raw <select>), optimistic updates w/ rollback,
 *   confirm-on-row delete (no window.confirm).
 * - Audit: grouped-by-day activity timeline with action icons, relative
 *   time and action-type filter chips.
 * - Add-user modal with role picker cards and language toggle.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { hasPermission } from '@/lib/rbac';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarSegments, ToolbarChips, ToolbarSpacer } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminService, AuditLog } from '@/modules/administration/service';
import { api } from '@/lib/api';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { User, UserRole, Language } from '@/types';
import { t } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import {
  Shield, ShieldCheck, Activity, Users, UserPlus, Trash2, X, Download,
  RotateCcw, LogIn, Settings, UserRound, BadgeCheck, Briefcase,
  ChevronDown, FileText, Globe, Check, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ */
/* role metadata                                                       */
/* ------------------------------------------------------------------ */

const ROLES: Record<UserRole, {
  en: string; ar: string; icon: LucideIcon; cls: string;
  descEn: string; descAr: string;
}> = {
  admin: {
    en: 'Admin', ar: 'مدير النظام', icon: ShieldCheck, cls: 'text-secondary bg-secondary/10',
    descEn: 'Full access to everything', descAr: 'وصول كامل لكل شيء',
  },
  hr_manager: {
    en: 'HR Manager', ar: 'مدير موارد بشرية', icon: BadgeCheck, cls: 'text-primary bg-primary/10',
    descEn: 'Manages people, payroll & approvals', descAr: 'إدارة الموظفين والرواتب والموافقات',
  },
  manager: {
    en: 'Manager', ar: 'مدير', icon: Briefcase, cls: 'text-warning bg-warning/10',
    descEn: 'Approves team requests', descAr: 'يعتمد طلبات الفريق',
  },
  employee: {
    en: 'Employee', ar: 'موظف', icon: UserRound, cls: 'text-gray-600 bg-gray-100',
    descEn: 'Self-service access only', descAr: 'وصول للخدمة الذاتية فقط',
  },
};

const ROLE_KEYS = Object.keys(ROLES) as UserRole[];

/* audit action → icon/tone */
const ACTION_META: Record<string, { icon: LucideIcon; cls: string }> = {
  Login: { icon: LogIn, cls: 'text-success bg-success/10' },
  Settings: { icon: Settings, cls: 'text-info bg-info/10' },
  User: { icon: UserRound, cls: 'text-primary bg-primary/10' },
};
const actionMeta = (action: string) =>
  ACTION_META[action] || { icon: FileText, cls: 'text-gray-500 bg-gray-100' };

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function relTime(iso: string, language: 'en' | 'ar'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('just now', 'الآن', language);
  if (min < 60) return language === 'ar' ? `قبل ${min} د` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return language === 'ar' ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return language === 'ar' ? `قبل ${d} يوم` : `${d}d ago`;
}

function dayLabel(iso: string, language: 'en' | 'ar'): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return t('Today', 'اليوم', language);
  if (same(d, yest)) return t('Yesterday', 'أمس', language);
  return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-md bg-primary/10 text-sm font-semibold text-primary ${className}`}>
      {initials || '?'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* role menu (replaces the raw <select>)                               */
/* ------------------------------------------------------------------ */

function RoleMenu({
  value, disabled, language, onChange,
}: {
  value: UserRole;
  disabled?: boolean;
  language: 'en' | 'ar';
  onChange: (r: UserRole) => void;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const meta = ROLES[value];
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${meta.cls} ${
          disabled ? 'cursor-default' : 'hover:opacity-80'
        }`}
      >
        <meta.icon className="h-3.5 w-3.5" />
        {t(meta.en, meta.ar, language)}
        {!disabled && <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 w-64 rounded-md border border-gray-100 bg-white p-1 shadow-dropdown animate-fade-in">
          {ROLE_KEYS.map((r) => {
            const m = ROLES[r];
            const active = r === value;
            return (
              <button
                key={r}
                type="button"
                onClick={() => { setOpen(false); if (!active) onChange(r); }}
                className={`flex w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-start transition-colors ${
                  active ? 'bg-primary/5' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm ${m.cls}`}>
                  <m.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">{t(m.en, m.ar, language)}</span>
                  <span className="block truncate text-xs text-gray-400">{t(m.descEn, m.descAr, language)}</span>
                </span>
                {active && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */

export default function AdministrationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();

  const [users, setUsers] = React.useState<User[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'users' | 'audit'>('users');
  const search = usePageSearch('/administration', 'Search users & activity…', 'ابحث في المستخدمين والنشاط…');
  const [actionFilter, setActionFilter] = React.useState<string>('all');
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '', nameAr: '', email: '',
    role: 'employee' as UserRole, language: 'en' as Language,
  });

  React.useEffect(() => {
    if (!hasPermission(user?.role, 'user:manage')) {
      router.replace('/');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  const loadData = async () => {
    setLoading(true);
    const [usersRes, auditRes] = await Promise.all([
      adminService.getUsers(),
      adminService.getAuditLogs(),
    ]);
    if (usersRes.success && usersRes.data) setUsers(usersRes.data.data);
    if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data.data);
    setLoading(false);
  };

  /* ---------- derived ---------- */
  const q = search.trim().toLowerCase();
  const visibleUsers = React.useMemo(
    () => users.filter((u) => !q || u.name.toLowerCase().includes(q) || (u.nameAr || '').includes(search.trim()) || u.email.toLowerCase().includes(q)),
    [users, q, search]
  );
  const actionTypes = React.useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.action))),
    [auditLogs]
  );
  const visibleLogs = React.useMemo(() => {
    let list = auditLogs;
    if (actionFilter !== 'all') list = list.filter((l) => l.action === actionFilter);
    if (q) list = list.filter((l) => l.userName.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [auditLogs, actionFilter, q]);
  const logGroups = React.useMemo(() => {
    const groups: { label: string; items: AuditLog[] }[] = [];
    for (const l of visibleLogs) {
      const label = dayLabel(l.timestamp, language);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(l);
      else groups.push({ label, items: [l] });
    }
    return groups;
  }, [visibleLogs, language]);

  const admins = users.filter((u) => u.role === 'admin').length;
  const employees = users.filter((u) => u.role === 'employee').length;

  /* ---------- actions ---------- */
  const exportAuditCsv = () => {
    downloadCsv(
      visibleLogs.map((a) => ({ id: a.id, user: a.userName, action: a.action, details: a.details, timestamp: a.timestamp })),
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const [confirmReset, setConfirmReset] = React.useState(false);

  const handleResetDemo = async () => {
    setConfirmReset(false);
    setSaving(true);
    const res = await api.post('/administration/reset', {});
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', title: t('Demo data reset', 'تمت إعادة تعيين بيانات العرض', language) });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Reset failed', 'فشلت إعادة التعيين', language) });
    }
  };

  const handleAddUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast({ type: 'error', title: t('Name and email are required', 'الاسم والبريد الإلكتروني مطلوبان', language) });
      return;
    }
    setSaving(true);
    try {
      const res = await adminService.createUser(form);
      if (res.success && res.data) {
        addToast({ type: 'success', title: t('User created successfully', 'تم إنشاء المستخدم بنجاح', language) });
        setShowAddModal(false);
        setForm({ name: '', nameAr: '', email: '', role: 'employee', language: 'en' });
        loadData();
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to create user', 'فشل إنشاء المستخدم', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  /* optimistic role change with rollback */
  const handleRoleChange = async (target: User, role: UserRole) => {
    const prev = users;
    setUsers((list) => list.map((u) => (u.id === target.id ? { ...u, role } : u)));
    const res = await adminService.updateUser(target.id, { role });
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('Role updated', 'تم تحديث الدور', language) });
    } else {
      setUsers(prev);
      addToast({ type: 'error', title: res.error || t('Failed to update role', 'فشل تحديث الدور', language) });
    }
  };

  /* optimistic delete with rollback (inline confirm, no window.confirm) */
  const handleRemoveUser = async (target: User) => {
    setConfirmDelete(null);
    setDeleting(target.id);
    const prev = users;
    setUsers((list) => list.filter((u) => u.id !== target.id));
    const res = await adminService.removeUser(target.id);
    setDeleting(null);
    if (res.success) {
      addToast({ type: 'success', title: t('User removed', 'تم حذف المستخدم', language) });
    } else {
      setUsers(prev);
      addToast({ type: 'error', title: res.error || t('Failed to remove user', 'فشل حذف المستخدم', language) });
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-5" dir={dir}>
      <PageHeader
        icon={Shield}
        title={t('Administration', 'الإدارة', language)}
        subtitle={t('User management and system monitoring', 'إدارة المستخدمين ومراقبة النظام', language)}
        actions={
          <>
            <HeaderAction icon={RotateCcw} label={t('Reset Demo Data', 'إعادة تعيين البيانات', language)} onClick={() => setConfirmReset(true)} disabled={saving} />
            <ModuleSettingsMenu module={t('Administration', 'الإدارة', language)} onExport={exportAuditCsv} />
            <HeaderAction icon={UserPlus} label={t('Add User', 'إضافة مستخدم', language)} primary onClick={() => setShowAddModal(true)} />
          </>
        }
      />

      {/* slim stat bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md bg-white px-5 py-3.5 shadow-card">
        {[
          { label: t('Users', 'المستخدمون', language), value: users.length, icon: Users, cls: 'text-primary' },
          { label: t('Admins', 'مديرو النظام', language), value: admins, icon: ShieldCheck, cls: 'text-secondary' },
          { label: t('Employees', 'الموظفون', language), value: employees, icon: UserRound, cls: 'text-success' },
          { label: t('Audit events', 'أحداث التدقيق', language), value: auditLogs.length, icon: Activity, cls: 'text-info' },
        ].map((s, i) => (
          <div key={s.label} className={`flex items-center gap-2 ${i > 0 ? 'sm:border-s sm:border-gray-100 sm:ps-6' : ''}`}>
            <s.icon className={`h-4 w-4 ${s.cls}`} />
            <span className="text-lg font-bold leading-none text-gray-900">{loading ? '—' : s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* main card */}
      <div className="rounded-md bg-white shadow-card">
        {/* toolbar: segmented tabs + search + context action */}
        <div className="border-b border-gray-100 px-4 py-3">
          <Toolbar className="gap-2">
            <ToolbarSegments
              value={tab}
              onChange={setTab}
              options={[
                { value: 'users', icon: Users, label: t('Users', 'المستخدمون', language), count: users.length },
                { value: 'audit', icon: Activity, label: t('Audit Log', 'سجل التدقيق', language), count: auditLogs.length },
              ]}
            />
            <ToolbarSpacer />
            {tab === 'audit' && (
              <HeaderAction icon={Download} label={t('Export CSV', 'تصدير CSV', language)} onClick={exportAuditCsv} disabled={visibleLogs.length === 0} />
            )}
          </Toolbar>
        </div>

        {/* audit action filter chips */}
        {tab === 'audit' && actionTypes.length > 1 && (
          <div className="border-b border-gray-50 px-4 py-2.5">
            <ToolbarChips
              value={actionFilter}
              onChange={setActionFilter}
              options={['all', ...actionTypes].map((a) => ({ value: a, label: a === 'all' ? t('All', 'الكل', language) : a }))}
            />
          </div>
        )}

        {/* ---------------- users list ---------------- */}
        {tab === 'users' && (
          <div>
            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded-sm bg-gray-100" />
                      <div className="h-2.5 w-56 rounded-sm bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleUsers.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">
                {t('No users match your search', 'لا يوجد مستخدمون مطابقون لبحثك', language)}
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {visibleUsers.map((u) => {
                  const isPrimary = u.id === 'user-1';
                  const isSelf = u.id === user?.id;
                  const displayName = language === 'ar' ? u.nameAr || u.name : u.name;
                  return (
                    <li key={u.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/60">
                      <Avatar name={u.name} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-gray-900">{displayName}</span>
                          {isSelf && (
                            <span className="rounded-full bg-info/10 px-2 py-px text-[11px] font-medium text-info">
                              {t('You', 'أنت', language)}
                            </span>
                          )}
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-px text-[11px] font-medium text-secondary">
                              <ShieldCheck className="h-3 w-3" />
                              {t('Primary admin', 'المدير الرئيسي', language)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-400">{u.email}</p>
                      </div>

                      <span className="hidden items-center gap-1 text-xs text-gray-400 sm:inline-flex">
                        <Globe className="h-3.5 w-3.5" />
                        {u.language === 'ar' ? 'العربية' : 'EN'}
                      </span>

                      <RoleMenu
                        value={u.role}
                        disabled={isPrimary}
                        language={language}
                        onChange={(r) => handleRoleChange(u, r)}
                      />

                      {!isPrimary && (
                        confirmDelete === u.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemoveUser(u)}
                              className="rounded-md bg-error px-2.5 py-1.5 text-xs font-medium text-white hover:bg-error-dark"
                            >
                              {t('Remove', 'حذف', language)}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              aria-label={t('Cancel', 'إلغاء', language)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ) : deleting === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            aria-label={t('Remove user', 'حذف المستخدم', language)}
                            className="rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ---------------- audit timeline ---------------- */}
        {tab === 'audit' && (
          <div className="p-4">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('Loading…', 'جارٍ التحميل…', language)}</p>
            ) : logGroups.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">
                {t('No activity recorded yet', 'لا يوجد نشاط مسجل بعد', language)}
              </p>
            ) : (
              <div className="space-y-6">
                {logGroups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g.label}</p>
                    <ol className="relative ms-4 space-y-4 border-s border-gray-100 ps-5">
                      {g.items.map((l) => {
                        const m = actionMeta(l.action);
                        return (
                          <li key={l.id} className="relative">
                            <span className={`absolute -start-[31px] top-0 grid h-6 w-6 place-items-center rounded-full ${m.cls}`}>
                              <m.icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-medium text-gray-900">{l.userName}</span>
                              <span className="rounded-sm bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500">{l.action}</span>
                              <span className="ms-auto shrink-0 text-xs text-gray-400" title={new Date(l.timestamp).toLocaleString()}>
                                {relTime(l.timestamp, language)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">{l.details}</p>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- add user modal ---------------- */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('Add User', 'إضافة مستخدم', language)}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-md bg-white shadow-modal animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                <UserPlus className="h-[18px] w-[18px]" />
              </span>
              <h2 className="flex-1 text-[15px] font-semibold text-gray-900">
                {t('Add New User', 'إضافة مستخدم جديد', language)}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label={t('Close', 'إغلاق', language)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label={t('Full Name', 'الاسم الكامل', language)}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('e.g. Khaled Al-Ali', 'مثال: خالد العلي', language)}
                />
                <Input
                  label={t('Full Name (Arabic)', 'الاسم الكامل (عربي)', language)}
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  placeholder={t('Optional', 'اختياري', language)}
                />
              </div>
              <Input
                label={t('Email Address', 'البريد الإلكتروني', language)}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@company.sa"
              />

              {/* role picker cards */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{t('Role', 'الدور', language)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_KEYS.map((r) => {
                    const m = ROLES[r];
                    const active = form.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        className={`flex items-start gap-2 rounded-md p-2.5 text-start transition-colors ${
                          active ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${m.cls}`}>
                          <m.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium ${active ? 'text-primary' : 'text-gray-900'}`}>
                            {t(m.en, m.ar, language)}
                          </span>
                          <span className="block truncate text-[11px] leading-4 text-gray-400">
                            {t(m.descEn, m.descAr, language)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* language toggle */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">{t('Language', 'اللغة', language)}</p>
                <div className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 p-0.5">
                  {([{ v: 'en' as Language, l: 'English' }, { v: 'ar' as Language, l: 'العربية' }]).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setForm({ ...form, language: o.v })}
                      className={`rounded-sm px-4 py-1.5 text-sm font-medium transition-colors ${
                        form.language === o.v ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleAddUser} loading={saving}>
                {t('Create User', 'إنشاء مستخدم', language)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title={t('Reset demo data?', 'إعادة تعيين بيانات العرض؟', language)}
        message={t('All demo data will be restored to its default state. This cannot be undone.', 'ستتم استعادة جميع بيانات العرض إلى حالتها الافتراضية. لا يمكن التراجع عن هذا.', language)}
        confirmLabel={t('Reset', 'إعادة تعيين', language)}
        loading={saving}
        onConfirm={handleResetDemo}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  );
}
