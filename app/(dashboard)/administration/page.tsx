'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { hasPermission } from '@/lib/rbac';
import { DashboardTile } from '@/components/ui/DashboardTile';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, Column } from '@/engines/table-engine';
import { adminService, AuditLog } from '@/modules/administration/service';
import { api } from '@/lib/api';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { User, UserRole, Language } from '@/types';
import { t, formatDate } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { Shield, Activity, Users, ClipboardList, UserPlus, Trash2, X, Download, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const roleLabels: Record<UserRole, { en: string; ar: string }> = {
  admin: { en: 'Admin', ar: 'مدير' },
  hr_manager: { en: 'HR Manager', ar: 'مدير موارد بشرية' },
  manager: { en: 'Manager', ar: 'مدير' },
  employee: { en: 'Employee', ar: 'موظف' },
};

const roleColors: Record<UserRole, string> = {
  admin: 'text-secondary bg-secondary/10',
  hr_manager: 'text-primary bg-primary/10',
  manager: 'text-warning bg-warning/10',
  employee: 'text-gray-600 bg-gray-100',
};

export default function AdministrationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [users, setUsers] = React.useState<User[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'users' | 'audit'>('users');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    nameAr: '',
    email: '',
    role: 'employee' as UserRole,
    language: 'en' as Language,
  });

  React.useEffect(() => {
    if (!hasPermission(user?.role, 'user:manage')) {
      router.replace('/');
      return;
    }
    loadData();
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

  const exportAuditCsv = () => {
    downloadCsv(
      auditLogs.map((a) => ({
        id: a.id,
        user: a.userName,
        action: a.action,
        details: a.details,
        timestamp: a.timestamp,
      })),
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleResetDemo = async () => {
    const confirmed = window.confirm(
      t(
        'Reset all demo data to default state? This cannot be undone.',
        'إعادة تعيين جميع بيانات العرض إلى الحالة الافتراضية؟ لا يمكن التراجع عن هذا.',
        language
      )
    );
    if (!confirmed) return;
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

  const handleRoleChange = async (user: User, role: UserRole) => {
    if (role === user.role) return;
    const res = await adminService.updateUser(user.id, { role });
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('Role updated', 'تم تحديث الدور', language) });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update role', 'فشل تحديث الدور', language) });
    }
  };

  const handleRemoveUser = async (user: User) => {
    const confirmed = window.confirm(
      t(`Remove user ${user.name}?`, `حذف المستخدم ${user.name}؟`, language)
    );
    if (!confirmed) return;
    const res = await adminService.removeUser(user.id);
    if (res.success) {
      addToast({ type: 'success', title: t('User removed', 'تم حذف المستخدم', language) });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to remove user', 'فشل حذف المستخدم', language) });
    }
  };

  const userColumns: Column<User>[] = [
    { key: 'name', header: 'Name', headerAr: 'الاسم' },
    { key: 'email', header: 'Email', headerAr: 'البريد الإلكتروني' },
    {
      key: 'role',
      header: 'Role',
      headerAr: 'الدور',
      render: (u) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
            {t(roleLabels[u.role].en, roleLabels[u.role].ar, language)}
          </span>
          {u.id !== 'user-1' && (
            <select
              value={u.role}
              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
              aria-label={t('Change role', 'تغيير الدور', language)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {t(roleLabels[r].en, roleLabels[r].ar, language)}
                </option>
              ))}
            </select>
          )}
        </div>
      ),
    },
    {
      key: 'language',
      header: 'Language',
      headerAr: 'اللغة',
      render: (u) => <span className="capitalize text-sm">{u.language === 'ar' ? 'العربية' : 'English'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        u.id !== 'user-1' ? (
          <button
            onClick={() => handleRemoveUser(u)}
            aria-label={t('Remove user', 'حذف المستخدم', language)}
            className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null,
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    { key: 'userName', header: 'User', headerAr: 'المستخدم' },
    { key: 'action', header: 'Action', headerAr: 'الإجراء' },
    { key: 'details', header: 'Details', headerAr: 'التفاصيل' },
    {
      key: 'timestamp',
      header: 'Date',
      headerAr: 'التاريخ',
      render: (l) => formatDate(l.timestamp, language),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Administration', 'الإدارة', language)}
        subtitle={t('User management and system monitoring', 'إدارة المستخدمين ومراقبة النظام', language)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardTile
          icon={Users}
          label={t('Users', 'المستخدمون', language)}
          value={String(users.length)}
          iconClassName="bg-primary/10 text-primary"
          chip={users.length > 0 ? t('accounts', 'حساب', language) : undefined}
          chipClassName="bg-primary/10 text-primary"
        />
        <DashboardTile
          icon={Activity}
          label={t('Audit Logs', 'سجلات التدقيق', language)}
          value={String(auditLogs.length)}
          iconClassName="bg-info/10 text-info"
          chip={auditLogs.length > 0 ? t('events', 'حدث', language) : undefined}
          chipClassName="bg-info/10 text-info"
        />
        <DashboardTile
          icon={Shield}
          label={t('Admins', 'المديرون', language)}
          value={String(users.filter((u) => u.role === 'admin').length)}
          iconClassName="bg-warning/10 text-warning"
          chip={users.length > 0 ? `${Math.round((users.filter((u) => u.role === 'admin').length / users.length) * 100)}%` : undefined}
          chipClassName="bg-warning/10 text-warning"
        />
        <DashboardTile
          icon={ClipboardList}
          label={t('Employees', 'الموظفون', language)}
          value={String(users.filter((u) => u.role === 'employee').length)}
          iconClassName="bg-success/10 text-success"
          chip={users.length > 0 ? `${Math.round((users.filter((u) => u.role === 'employee').length / users.length) * 100)}%` : undefined}
          chipClassName="bg-success/10 text-success"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('users')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users className="h-4 w-4 inline me-1" />
                {t('Users', 'المستخدمون', language)}
              </button>
              <button
                onClick={() => setTab('audit')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'audit' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Activity className="h-4 w-4 inline me-1" />
                {t('Audit Log', 'سجل التدقيق', language)}
              </button>
            </div>
            {tab === 'users' && (
              <>
                <Button onClick={() => setShowAddModal(true)} title={t('Add User', 'إضافة مستخدم', language)} aria-label={t('Add User', 'إضافة مستخدم', language)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleResetDemo} disabled={saving} title={t('Reset Demo', 'إعادة تعيين', language)} aria-label={t('Reset Demo', 'إعادة تعيين', language)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
            {tab === 'audit' && (
              <Button variant="ghost" onClick={exportAuditCsv} title={t('Export CSV', 'تصدير CSV', language)} aria-label={t('Export CSV', 'تصدير CSV', language)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <ModuleSettingsMenu
              module={t('Administration', 'الإدارة', language)}
              onExport={tab === 'audit' ? exportAuditCsv : undefined}
            />
          </div>
        </CardHeader>
        <CardBody>
          {tab === 'users' ? (
            <DataTable
              columns={userColumns}
              data={users}
              loading={loading}
              locale={language}
              dir={dir}
              getRowKey={(u) => u.id}
            />
          ) : (
            <DataTable
              columns={auditColumns}
              data={auditLogs}
              loading={loading}
              locale={language}
              dir={dir}
              getRowKey={(l) => l.id}
            />
          )}
        </CardBody>
      </Card>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={t('Add User', 'إضافة مستخدم', language)}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('Add New User', 'إضافة مستخدم جديد', language)}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label={t('Close', 'إغلاق', language)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
            <Input
              label={t('Email Address', 'البريد الإلكتروني', language)}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.sa"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {t('Role', 'الدور', language)}
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {t(roleLabels[r].en, roleLabels[r].ar, language)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {t('Language', 'اللغة', language)}
                </label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
}
