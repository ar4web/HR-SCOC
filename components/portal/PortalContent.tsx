'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DashboardTile } from '@/components/ui/DashboardTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { meService, MeResponse } from '@/modules/me/service';
import { t, formatCurrency, getLeaveTypeLabel } from '@/lib/utils';
import {
  CalendarDays,
  Plane,
  BellRing,
  ReceiptText,
  Sparkles,
  UserCircle2,
  Download,
} from 'lucide-react';

const statusMeta: Record<string, { en: string; ar: string; cls: string }> = {
  present: { en: 'Present', ar: 'حاضر', cls: 'bg-success/10 text-success' },
  late: { en: 'Late', ar: 'متأخر', cls: 'bg-warning/10 text-warning' },
  absent: { en: 'Absent', ar: 'غائب', cls: 'bg-error/10 text-error' },
  half_day: { en: 'Half Day', ar: 'نصف يوم', cls: 'bg-info/10 text-info' },
};

export function PortalContent() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const router = useRouter();
  const [data, setData] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const res = await meService.get();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        addToast({ type: 'error', title: t('No employee profile is linked to this account', 'لا يوجد ملف موظف مرتبط بهذا الحساب', language) });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <UserCircle2 className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">
          {t('No employee profile linked to your login. Contact your HR administrator.', 'لا يوجد ملف موظف مرتبط بحسابك. تواصل مع إدارة الموارد البشرية.', language)}
        </p>
      </div>
    );
  }

  const e = data.employee;
  const label = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const name = language === 'ar' ? e.fullNameAr || e.fullName : e.fullName;
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthLabel = new Date().toLocaleDateString(language === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ===== Hero ===== */}
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary via-primary/85 to-secondary/70" />
        <CardBody className="pt-0">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 px-2">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg ring-4 ring-white/60 text-3xl font-bold text-primary">
                {name.charAt(0)}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-900">{name}</h1>
                <p className="text-sm text-gray-500">
                  {e.position} · {e.department} · {e.employeeId}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge status={e.status} locale={language} />
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    <Sparkles className="h-3 w-3 me-1" />
                    {label('Active Employee', 'موظف نشط')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button size="sm" variant="outline" onClick={() => router.push('/leaves/new')}>
                <Plane className="h-3.5 w-3.5" />
                {label('Request Leave', 'طلب إجازة')}
              </Button>
              <Button size="sm" onClick={() => router.push('/attendance')}>
                <CalendarDays className="h-3.5 w-3.5" />
                {label('My Attendance', 'حضوري')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ===== Stat tiles ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardTile
          icon={CalendarDays}
          iconClassName="bg-primary/10 text-primary"
          label={label('Annual Entitlement', 'الرصيد السنوي')}
          value={`${data.leaveStats.annual}`}
          sub={label('vacation days / year', 'يوم إجازة في السنة')}
        />
        <DashboardTile
          icon={Plane}
          iconClassName="bg-success/10 text-success"
          label={label('Days Remaining', 'الأيام المتبقية')}
          value={`${data.leaveStats.balance}`}
          sub={`${data.leaveStats.used} ${label('used this year', 'مستخدمة هذا العام')}`}
        />
        <DashboardTile
          icon={BellRing}
          iconClassName="bg-warning/10 text-warning"
          label={label('Present · This Month', 'الحضور · هذا الشهر')}
          value={`${data.monthAttendance.present}`}
          sub={label(`${data.monthAttendance.late} late · ${data.monthAttendance.absent} absent`, `متأخر ${data.monthAttendance.late} · غائب ${data.monthAttendance.absent}`)}
          href="/attendance"
        />
        <DashboardTile
          icon={ReceiptText}
          iconClassName="bg-info/10 text-info"
          label={label('Latest Payslip', 'أحدث كشف راتب')}
          value={data.payslips[0] ? formatCurrency(data.payslips[0].netPay) : '—'}
          sub={data.payslips[0]?.period ? `${data.payslips[0].period} · ${data.payslips[0].status}` : label('no payslip yet', 'لا يوجد كشف راتب بعد')}
          onClick={data.payslips[0] ? () => window.open(`/api/payroll/payslip/${data.payslips[0].id}`, '_blank', 'noopener') : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: leaves + payslips */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plane className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">{label('My Leave Requests', 'طلبات إجازتي')}</h2>
              </div>
              <button onClick={() => router.push('/leaves')} className="text-primary hover:underline text-xs font-semibold">
                {label('View all', 'عرض الكل')}
              </button>
            </CardHeader>
            <CardBody className="p-0">
              {data.leaves.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">{label('No requests yet', 'لا توجد طلبات بعد')}</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {data.leaves.map((l) => (
                    <li key={l.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{getLeaveTypeLabel(l.type, language)}</p>
                        <p className="text-xs text-gray-400">
                          {l.startDate} → {l.endDate} · {l.daysCount} {label('days', 'أيام')}
                        </p>
                      </div>
                      <Badge status={l.status} locale={language} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ReceiptText className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">{label('My Latest Payslips', 'أحدث كشوف رواتبي')}</h2>
              </div>
              <button onClick={() => router.push('/payroll/payslips')} className="text-primary hover:underline text-xs font-semibold">
                {label('All payslips', 'كل كشوف الرواتب')}
              </button>
            </CardHeader>
            <CardBody className="p-0">
              {data.payslips.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">{label('No payslips yet', 'لا توجد كشوف رواتب بعد')}</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {data.payslips.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.period}</p>
                        <p className="text-xs text-gray-400">{p.status}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.netPay)}</span>
                        <a
                          href={`/api/payroll/payslip/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          {label('PDF', 'ملف PDF')}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 2/3: attendance */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">{label('My Attendance', 'حضوري')}</h2>
              </div>
              <p className="text-xs text-gray-400">{monthPrefix} · {thisMonthLabel}</p>
            </CardHeader>
            <CardBody className="p-0">
              {data.attendance.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">{label('No records yet', 'لا توجد سجلات بعد')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left rtl:text-right text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-5 py-3 font-medium">{label('Date', 'التاريخ')}</th>
                        <th className="px-5 py-3 font-medium">{label('Clock In', 'الحضور')}</th>
                        <th className="px-5 py-3 font-medium">{label('Clock Out', 'الانصراف')}</th>
                        <th className="px-5 py-3 font-medium">{label('Status', 'الحالة')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance.map((a, i) => {
                        const meta = statusMeta[a.status] || { en: a.status, ar: a.status, cls: 'bg-gray-100 text-gray-600' };
                        return (
                          <tr key={`${a.date}-${i}`} className="border-b border-gray-50 last:border-0">
                            <td className="px-5 py-3 text-sm text-gray-700">{a.date}</td>
                            <td className="px-5 py-3 text-sm text-gray-700">{a.clockIn}</td>
                            <td className="px-5 py-3 text-sm text-gray-700">{a.clockOut || '—'}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                                {label(meta.en, meta.ar)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {data.monthAttendance.hours > 0 && (
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{label('Total hours this month', 'إجمالي الساعات هذا الشهر')}</span>
                  <span className="text-sm font-semibold text-gray-900">{data.monthAttendance.hours.toFixed(1)} h</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/10">
            <CardBody className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <UserCircle2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label('Personal details & employment info', 'بياناتي الشخصية ومعلومات الوظيفة')}</p>
                  <p className="text-xs text-gray-500">
                    {e.nationality} · {e.hireDate} {label('hire date', 'تاريخ التوظيف')} · {e.contractType}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push('/employees/' + e.id)}>
                  {label('View Profile', 'عرض الملف')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => router.push('/notifications')}>
                  <BellRing className="h-3.5 w-3.5" />
                  {data.unread} {label('unread', 'غير مقروء')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}