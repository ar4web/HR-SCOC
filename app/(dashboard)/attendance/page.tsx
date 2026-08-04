'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/engines/table-engine';
import { Badge } from '@/components/ui/Badge';
import { attendanceService } from '@/modules/attendance/service';
import { employeeService } from '@/modules/employee-management/service';
import { Attendance, Employee } from '@/types';
import { t, formatDate } from '@/lib/utils';
import { Clock, LogIn, LogOut, ClipboardList } from 'lucide-react';

export default function AttendancePage() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const [records, setRecords] = React.useState<Attendance[]>([]);
  const [employees, setEmployees] = React.useState<Map<string, Employee>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [clocking, setClocking] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    const employeeId = user?.role === 'employee' ? user.id : undefined;
    const [recordsRes, empRes] = await Promise.all([
      attendanceService.list({ employeeId }),
      employeeService.list({ page: 1, pageSize: 1000 }),
    ]);
    if (recordsRes.success && recordsRes.data) setRecords(recordsRes.data.data);
    if (empRes.success && empRes.data) {
      setEmployees(new Map(empRes.data.data.map((e) => [e.id, e])));
    }
    setLoading(false);
  };

  const handleClockIn = async () => {
    setClocking(true);
    const res = await attendanceService.clockIn(user?.id || '');
    if (res.success) {
      setMessage(t('Clocked in successfully!', 'تم تسجيل الحضور بنجاح!', language));
      loadRecords();
    } else {
      setMessage(res.error || '');
    }
    setClocking(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClockOut = async () => {
    setClocking(true);
    const res = await attendanceService.clockOut(user?.id || '');
    if (res.success) {
      setMessage(t('Clocked out successfully!', 'تم تسجيل الانصراف بنجاح!', language));
      loadRecords();
    } else {
      setMessage(res.error || '');
    }
    setClocking(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find((r) => r.date === today);

  const columns: Column<Attendance>[] = [
    {
      key: 'employeeId',
      header: t('Employee', 'الموظف', language),
      render: (r) => {
        const emp = employees.get(r.employeeId);
        if (!emp) return <span className="text-gray-400">{r.employeeId}</span>;
        return (
          <div>
            <p className="font-medium text-gray-900">
              {language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName}
            </p>
            <p className="text-xs text-gray-500">{emp.employeeId}</p>
          </div>
        );
      },
    },
    { key: 'date', header: t('Date', 'التاريخ', language), render: (r) => formatDate(r.date) },
    { key: 'clockIn', header: t('Clock In', 'الحضور', language) },
    {
      key: 'clockOut',
      header: t('Clock Out', 'الانصراف', language),
      render: (r) => r.clockOut || <span className="text-gray-400">--</span>,
    },
    {
      key: 'status',
      header: t('Status', 'الحالة', language),
      render: (r) => <Badge status={r.status} locale={language} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Attendance', 'الحضور والانصراف', language)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Track attendance and working hours', 'تتبع الحضور والانصراف وساعات العمل', language)}
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm animate-fade-in">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <LogIn className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('Clock In', 'تسجيل الحضور', language)}
                </h3>
                <p className="text-xs text-gray-500">
                  {todayRecord?.clockIn
                    ? t(`Clocked in at ${todayRecord.clockIn}`, `تم تسجيل الحضور الساعة ${todayRecord.clockIn}`, language)
                    : t('Start your work day', 'ابدأ يوم عملك', language)}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClockIn}
              loading={clocking}
              disabled={!!todayRecord?.clockIn}
              className="w-full"
              variant={todayRecord?.clockIn ? 'outline' : 'primary'}
            >
              <LogIn className="h-4 w-4" />
              {todayRecord?.clockIn
                ? t('Already Clocked In', 'تم تسجيل الحضور', language)
                : t('Clock In', 'تسجيل حضور', language)}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('Clock Out', 'تسجيل الانصراف', language)}
                </h3>
                <p className="text-xs text-gray-500">
                  {todayRecord?.clockOut
                    ? t(`Clocked out at ${todayRecord.clockOut}`, `تم تسجيل الانصراف الساعة ${todayRecord.clockOut}`, language)
                    : t('End your work day', 'أنهي يوم عملك', language)}
                </p>
              </div>
            </div>
            <Button
              onClick={handleClockOut}
              loading={clocking}
              disabled={!todayRecord?.clockIn || !!todayRecord?.clockOut}
              className="w-full"
              variant={todayRecord?.clockOut ? 'outline' : 'warning'}
            >
              <LogOut className="h-4 w-4" />
              {todayRecord?.clockOut
                ? t('Already Clocked Out', 'تم تسجيل الانصراف', language)
                : t('Clock Out', 'تسجيل انصراف', language)}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('Today Status', 'حالة اليوم', language)}
                </h3>
                <p className="text-xs text-gray-500">
                  {todayRecord
                    ? `${todayRecord.clockIn} - ${todayRecord.clockOut || '--'}`
                    : t('No record yet', 'لا يوجد تسجيل بعد', language)}
                </p>
              </div>
            </div>
            {todayRecord && <Badge status={todayRecord.status} locale={language} />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Attendance Records', 'سجل الحضور', language)}
          </h2>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={columns}
            data={records}
            loading={loading}
            locale={language}
            dir={dir}
            getRowKey={(r) => r.id}
          />
        </CardBody>
      </Card>
    </div>
  );
}
