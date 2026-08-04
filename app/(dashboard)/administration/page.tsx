'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, Column } from '@/engines/table-engine';
import { adminService, AuditLog } from '@/modules/administration/service';
import { User, UserRole, Language } from '@/types';
import { t, formatDate } from '@/lib/utils';
import { Shield, Activity, Users, ClipboardList, UserPlus, Trash2, X } from 'lucide-react';
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
    loadData();
  }, []);

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

  const handleAddUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast({ type: 'error', title: t('Name and email are required', 'الاسم والبريد الإلكتروني مطلوبان', language) });
      return;
    }
    setSaving(true);
    const res = await adminService.createUser(form);
    setSaving(false);
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('User created successfully', 'تم إنشاء المستخدم بنجاح', language) });
      setShowAddModal(false);
      setForm({ name: '', nameAr: '', email: '', role: 'employee', language: 'en' });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to create user', 'فشل إنشاء المستخدم', language) });
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
    { key: 'name', header: t('Name', 'الاسم', language) },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: t('Role', 'الدور', language),
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
      header: t('Language', 'اللغة', language),
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
    { key: 'userName', header: t('User', 'المستخدم', language) },
    { key: 'action', header: t('Action', 'الإجراء', language) },
    { key: 'details', header: t('Details', 'التفاصيل', language) },
    {
      key: 'timestamp',
      header: t('Date', 'التاريخ', language),
      render: (l) => formatDate(l.timestamp),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Administration', 'الإدارة', language)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('User management and system monitoring', 'إدارة المستخدمين ومراقبة النظام', language)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">{t('Users', 'المستخدمون', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
              <p className="text-sm text-gray-500">{t('Audit Logs', 'سجلات التدقيق', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.role === 'admin').length}</p>
              <p className="text-sm text-gray-500">{t('Admins', 'المديرون', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.filter((u) => u.role === 'employee').length}</p>
              <p className="text-sm text-gray-500">{t('Employees', 'الموظفون', language)}</p>
            </div>
          </CardBody>
        </Card>
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
                <Users className="h-4 w-4 inline mr-1" />
                {t('Users', 'المستخدمون', language)}
              </button>
              <button
                onClick={() => setTab('audit')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'audit' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Activity className="h-4 w-4 inline mr-1" />
                {t('Audit Log', 'سجل التدقيق', language)}
              </button>
            </div>
            {tab === 'users' && (
              <Button onClick={() => setShowAddModal(true)}>
                <UserPlus className="h-4 w-4" />
                {t('Add User', 'إضافة مستخدم', language)}
              </Button>
            )}
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
              <Button onClick={handleAddUser} disabled={saving}>
                {saving ? t('Saving...', 'جارٍ الحفظ...', language) : t('Create User', 'إنشاء مستخدم', language)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
