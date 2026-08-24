'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { Employee, LeaveRequest } from '@/types';
import { t, formatDate, getLeaveTypeLabel } from '@/lib/utils';
import {
  ArrowLeft, CalendarDays, Clock, User, FileText,
  CheckCircle2, XCircle, Ban, SearchX, UserCheck,
} from 'lucide-react';

export default function LeaveDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [leave, setLeave] = React.useState<LeaveRequest | null>(null);
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<'approve' | 'reject' | 'cancel' | null>(null);

  const isManager = user?.role === 'admin' || user?.role === 'hr_manager';

  const load = async () => {
    setLoading(true);
    const [leaveRes, empRes] = await Promise.all([
      api.get<LeaveRequest>(`/leaves/${id}`),
      api.get<{ data: Employee[]; total: number }>('/employees'),
    ]);
    if (leaveRes.success && leaveRes.data) {
      setLeave(leaveRes.data);
      if (empRes.success && empRes.data) {
        setEmployee(empRes.data.data.find((e) => e.id === leaveRes.data!.employeeId) || null);
      }
    }
    setLoading(false);
  };

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject' | 'cancel') => {
    if (!leave) return;
    setActionLoading(action);
    const res = await api.put<LeaveRequest>(`/leaves/${leave.id}`, {
      action,
      approvedBy: user?.id || '',
    });

    if (res.success && res.data) {
      addToast({
        type: action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'info',
        title:
          action === 'approve'
            ? t('Leave approved', 'تمت الموافقة على الإجازة', language)
            : action === 'reject'
            ? t('Leave rejected', 'تم رفض الإجازة', language)
            : t('Leave cancelled', 'تم إلغاء الإجازة', language),
      });
      setLeave(res.data);
    } else {
      addToast({ type: 'error', title: res.error || t('Action failed', 'فشل الإجراء', language) });
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!leave) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('Leave request not found', 'طلب الإجازة غير موجود', language)}
        description={t('The leave request you are looking for does not exist', 'طلب الإجازة الذي تبحث عنه غير موجود', language)}
        locale={language}
        action={
          <Button variant="outline" onClick={() => router.push('/leaves')}>
            <ArrowLeft className="h-4 w-4" />
            {t('Back to Leaves', 'العودة إلى الإجازات', language)}
          </Button>
        }
      />
    );
  }

  const infoRows: { label: { en: string; ar: string }; value: string; icon: typeof CalendarDays }[] = [
    { label: { en: 'Employee ID', ar: 'رقم الموظف' }, value: employee?.employeeId || leave.employeeId, icon: User },
    { label: { en: 'Employee Name', ar: 'اسم الموظف' }, value: employee ? (language === 'ar' ? employee.fullNameAr || employee.fullName : employee.fullName) : '--', icon: UserCheck },
    { label: { en: 'Leave Type', ar: 'نوع الإجازة' }, value: getLeaveTypeLabel(leave.type, language), icon: CalendarDays },
    { label: { en: 'Start Date', ar: 'تاريخ البدء' }, value: formatDate(leave.startDate, language), icon: CalendarDays },
    { label: { en: 'End Date', ar: 'تاريخ الانتهاء' }, value: formatDate(leave.endDate, language), icon: CalendarDays },
    { label: { en: 'Total Days', ar: 'إجمالي الأيام' }, value: `${leave.daysCount}`, icon: Clock },
    { label: { en: 'Submitted', ar: 'تاريخ التقديم' }, value: formatDate(leave.createdAt, language), icon: Clock },
    ...(leave.approvedAt
      ? [{ label: { en: 'Processed At', ar: 'تاريخ المعالجة' }, value: formatDate(leave.approvedAt, language), icon: Clock as typeof CalendarDays }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            onClick={() => router.push('/leaves')}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors rtl:rotate-180"
            aria-label={t('Back', 'رجوع', language)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
              {t('Leave Request', 'طلب إجازة', language)}
            </h1>
            <p className="truncate text-sm text-gray-500 mt-0.5">
              {getLeaveTypeLabel(leave.type, language)} · {formatDate(leave.startDate, language)} - {formatDate(leave.endDate, language)}
            </p>
          </div>
          <div className="flex w-full items-center justify-end sm:w-auto sm:flex-none sm:ms-auto">
            <Badge status={leave.status} locale={language} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {t('Request Details', 'تفاصيل الطلب', language)}
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {infoRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label.en} className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">{t(row.label.en, row.label.ar, language)}</div>
                    <div className="text-sm font-medium text-gray-900 truncate">{row.value}</div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('Reason', 'السبب', language)}
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{leave.reason || t('No reason provided', 'لم يتم تقديم سبب', language)}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('Approval Workflow', 'مسار الموافقة', language)}
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {leave.status === 'pending' && isManager ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {t('Approve or reject this leave request. The employee will be notified of your decision.', 'وافق أو ارفض طلب الإجازة هذا. سيتم إشعار الموظف بقرارك.', language)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleAction('approve')}
                      loading={actionLoading === 'approve'}
                      disabled={actionLoading !== null}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t('Approve', 'موافقة', language)}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleAction('reject')}
                      loading={actionLoading === 'reject'}
                      disabled={actionLoading !== null}
                    >
                      <XCircle className="h-4 w-4" />
                      {t('Reject', 'رفض', language)}
                    </Button>
                  </div>
                </div>
              ) : leave.status === 'pending' ? (
                <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-sm text-gray-700">
                  {t('This request is pending approval by a manager.', 'هذا الطلب بانتظار موافقة مدير.', language)}
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('Status', 'الحالة', language)}</span>
                    <Badge status={leave.status} locale={language} />
                  </div>
                  {leave.approvedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('Processed At', 'تاريخ المعالجة', language)}</span>
                      <span className="font-medium text-gray-900">{formatDate(leave.approvedAt, language)}</span>
                    </div>
                  )}
                  {leave.status === 'approved' && isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction('cancel')}
                      loading={actionLoading === 'cancel'}
                      disabled={actionLoading !== null}
                    >
                      <Ban className="h-4 w-4" />
                      {t('Cancel Approval', 'إلغاء الموافقة', language)}
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}