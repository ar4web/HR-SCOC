'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/engines/table-engine';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { LeaveCalendar } from '@/components/modules/LeaveCalendar';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import PageHeader from '@/components/layout/PageHeader';
import { Employee, LeaveRequest } from '@/types';
import { t, formatDate, getLeaveTypeLabel } from '@/lib/utils';
import { Calendar, Plus, CheckCircle2, XCircle, List, Clock, Loader2, Trash2, Download } from 'lucide-react';

export default function LeavesPage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = React.useState<Map<string, Employee>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = React.useState<'all' | LeaveRequest['status']>('all');

  const loadData = async () => {
    setLoading(true);
    const [leaveRes, empRes] = await Promise.all([
      api.get<{ data: LeaveRequest[]; total: number }>('/leaves'),
      api.get<{ data: Employee[]; total: number }>('/employees'),
    ]);
    if (leaveRes.success && leaveRes.data) {
      setLeaves(leaveRes.data.data);
    }
    if (empRes.success && empRes.data) {
      setEmployees(new Map(empRes.data.data.map((e) => [e.id, e])));
    }
    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isManager = user?.role === 'admin' || user?.role === 'hr_manager' || user?.role === 'manager';

  const handleAction = async (leave: LeaveRequest, status: 'approved' | 'rejected') => {
    setActionLoading(leave.id);
    const res = await api.put<LeaveRequest>('/leaves', {
      id: leave.id,
      status,
      approvedBy: user?.id || '',
    });

    if (res.success) {
      addToast({
        type: 'success',
        title:
          status === 'approved'
            ? t('Leave approved', 'تمت الموافقة على الإجازة', language)
            : t('Leave rejected', 'تم رفض الإجازة', language),
      });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Action failed', 'فشل الإجراء', language) });
    }
    setActionLoading(null);
  };

  const handleDelete = async (leave: LeaveRequest) => {
    if (!window.confirm(t('Delete this leave request?', 'حذف طلب الإجازة هذا؟', language))) return;
    setActionLoading(leave.id);
    const res = await api.delete(`/leaves?id=${leave.id}`);
    if (res.success) {
      addToast({ type: 'success', title: t('Leave request deleted', 'تم حذف طلب الإجازة', language) });
      loadData();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete leave request', 'فشل حذف طلب الإجازة', language) });
    }
    setActionLoading(null);
  };

  const getEmployeeId = (leave: LeaveRequest) => {
    const emp = employees.get(leave.employeeId);
    return emp ? emp.employeeId : leave.employeeId;
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: t('Employee ID', 'رقم الموظف', language),
      render: (leave) => <span className="font-medium text-gray-900">{getEmployeeId(leave)}</span>,
    },
    {
      key: 'type',
      header: t('Type', 'النوع', language),
      render: (leave) => <span>{getLeaveTypeLabel(leave.type, language)}</span>,
    },
    {
      key: 'dates',
      header: t('Dates', 'التواريخ', language),
      render: (leave) => `${formatDate(leave.startDate, language)} - ${formatDate(leave.endDate, language)}`,
    },
    { key: 'daysCount', header: t('Total Days', 'إجمالي الأيام', language) },
    {
      key: 'status',
      header: t('Status', 'الحالة', language),
      render: (leave) => <Badge status={leave.status} locale={language} />,
    },
    ...(isManager
      ? [
          {
            key: 'actions',
            header: t('Actions', 'الإجراءات', language),
            render: (leave: LeaveRequest) =>
              leave.status === 'pending' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(leave, 'approved');
                    }}
                    disabled={actionLoading === leave.id}
                    className="p-1.5 rounded-lg text-success hover:bg-success/10 transition-colors disabled:opacity-50"
                    aria-label={t('Approve', 'موافقة', language)}
                    title={t('Approve', 'موافقة', language)}
                  >
                    {actionLoading === leave.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(leave, 'rejected');
                    }}
                    disabled={actionLoading === leave.id}
                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                    aria-label={t('Reject', 'رفض', language)}
                    title={t('Reject', 'رفض', language)}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(leave);
                    }}
                    disabled={actionLoading === leave.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error transition-colors disabled:opacity-50"
                    aria-label={t('Delete', 'حذف', language)}
                    title={t('Delete', 'حذف', language)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">
                  {leave.approvedAt ? formatDate(leave.approvedAt, language) : '--'}
                </span>
              ),
          } as Column<LeaveRequest>,
        ]
      : []),
  ];

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const filteredLeaves = statusFilter === 'all' ? leaves : leaves.filter((l) => l.status === statusFilter);

  const exportCsv = () => {
    downloadCsv(
      filteredLeaves.map((l) => {
        const emp = employees.get(l.employeeId);
        return {
          id: l.id,
          employee: emp ? `${emp.fullName} (${emp.employeeId})` : l.employeeId,
          type: getLeaveTypeLabel(l.type, 'en'),
          from: l.startDate,
          to: l.endDate,
          days: l.daysCount,
          status: l.status,
          reason: l.reason || '',
        };
      }),
      `leaves-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const statusTabs: { value: 'all' | LeaveRequest['status']; label: { en: string; ar: string } }[] = [
    { value: 'all', label: { en: 'All', ar: 'الكل' } },
    { value: 'pending', label: { en: 'Pending', ar: 'قيد الانتظار' } },
    { value: 'approved', label: { en: 'Approved', ar: 'معتمد' } },
    { value: 'rejected', label: { en: 'Rejected', ar: 'مرفوض' } },
    { value: 'cancelled', label: { en: 'Cancelled', ar: 'ملغي' } },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Leave Management', 'إدارة الإجازات', language)}
        subtitle={t('Manage leave requests and approvals', 'إدارة طلبات الإجازات والموافقات', language)}
        actions={
          <>
          <Link href="/leaves/new">
            <Button title={t('Request Leave', 'طلب إجازة', language)} aria-label={t('Request Leave', 'طلب إجازة', language)}>
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" onClick={exportCsv} title={t('Export CSV', 'تصدير CSV', language)} aria-label={t('Export CSV', 'تصدير CSV', language)}>
            <Download className="h-4 w-4" />
          </Button>
          <ModuleSettingsMenu
            module={t('Leaves', 'الإجازات', language)}
            onExport={exportCsv}
          />
          </>
        }
      />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('list')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'list' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4 inline me-1" />
              {t('All Requests', 'كل الطلبات', language)}
            </button>
            <button
              onClick={() => setTab('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'calendar' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 inline me-1" />
              {t('Calendar View', 'عرض التقويم', language)}
            </button>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-warning font-medium">
              <Clock className="h-3.5 w-3.5" />
              {t(`${pendingCount} pending`, `${pendingCount} قيد الانتظار`, language)}
            </div>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {tab === 'list' && (
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50/50">
              {statusTabs.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s.value ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t(s.label.en, s.label.ar, language)}
                </button>
              ))}
            </div>
          )}
          {tab === 'calendar' ? (
            <LeaveCalendar leaves={leaves} employees={employees} locale={language} dir={dir} />
          ) : filteredLeaves.length === 0 && !loading ? (
            <EmptyState
              icon={Calendar}
              title={t('No leave requests found', 'لم يتم العثور على طلبات إجازات', language)}
              description={t('Submit a leave request to get started', 'قدّم طلب إجازة للبدء', language)}
              locale={language}
              action={
                <Link href="/leaves/new">
                  <Button size="sm" title={t('Request Leave', 'طلب إجازة', language)} aria-label={t('Request Leave', 'طلب إجازة', language)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <DataTable<LeaveRequest>
              columns={columns}
              data={filteredLeaves}
              loading={loading}
              locale={language}
              dir={dir}
              getRowKey={(leave) => leave.id}
              emptyMessage="No leave requests found"
              emptyMessageAr="لم يتم العثور على طلبات إجازات"
              onRowClick={(leave) => router.push(`/leaves/${leave.id}`)}
              filters={{
                key: 'status',
                label: 'Status',
                labelAr: 'الحالة',
                options: statusTabs.filter((s) => s.value !== 'all').map((s) => ({ value: s.value, label: s.label.en, labelAr: s.label.ar })),
                getValue: (leave) => leave.status,
              }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
