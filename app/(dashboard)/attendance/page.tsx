'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DashboardTile } from '@/components/ui/DashboardTile';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/engines/table-engine';
import { Badge } from '@/components/ui/Badge';
import { attendanceService } from '@/modules/attendance/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { employeeService } from '@/modules/employee-management/service';
import { Attendance, Employee } from '@/types';
import { t, formatDate } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { Toolbar, ToolbarSelect, ToolbarInput } from '@/components/layout/Toolbar';
import { downloadCsv } from '@/lib/csv';
import { Clock, LogIn, LogOut, ClipboardList, UserCheck, AlarmClock, UserX, CalendarClock, Filter, MapPin, Download } from 'lucide-react';

export default function AttendancePage() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const [records, setRecords] = React.useState<Attendance[]>([]);
  const [employees, setEmployees] = React.useState<Map<string, Employee>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [clocking, setClocking] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const messageTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateFilter, setDateFilter] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('all');

  React.useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    const [recordsRes, empRes] = await Promise.all([
      attendanceService.list({}),
      employeeService.list({ page: 1, pageSize: 1000 }),
    ]);
    if (recordsRes.success && recordsRes.data) setRecords(recordsRes.data.data);
    if (empRes.success && empRes.data) {
      const empList = empRes.data.data;
      setEmployees(new Map(empList.map((e) => [e.id, e])));
      if (user?.role === 'employee') {
        const mine = empList.find((e) => e.userId === user.id);
        if (mine) {
          const filtered = recordsRes.success && recordsRes.data ? recordsRes.data.data.filter((r) => r.employeeId === mine.id) : [];
          setRecords(filtered);
        } else {
          setRecords([]);
        }
      }
    }
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const showMessage = (text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  const getGeolocation = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });

  const handleClockIn = async () => {
    setClocking(true);
    const geo = await getGeolocation();
    const res = await attendanceService.clockIn(user?.id || '', geo);
    if (res.success) {
      showMessage(
        geo
          ? t('Clocked in with GPS location!', 'تم تسجيل الحضور مع موقع GPS!', language)
          : t('Clocked in successfully!', 'تم تسجيل الحضور بنجاح!', language)
      );
      loadRecords();
    } else {
      showMessage(res.error || '');
    }
    setClocking(false);
  };

  const handleClockOut = async () => {
    setClocking(true);
    const res = await attendanceService.clockOut(user?.id || '');
    if (res.success) {
      showMessage(t('Clocked out successfully!', 'تم تسجيل الانصراف بنجاح!', language));
      loadRecords();
    } else {
      showMessage(res.error || '');
    }
    setClocking(false);
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayRecord = records.find((r) => r.date === today);

  const filteredRecords = records.filter((r) => {
    if (dateFilter && r.date !== dateFilter) return false;
    if (departmentFilter !== 'all') {
      const emp = employees.get(r.employeeId);
      if (emp && emp.department !== departmentFilter) return false;
    }
    return true;
  });

  const exportCsv = () => {
    downloadCsv(
      filteredRecords.map((r) => {
        const emp = employees.get(r.employeeId);
        return {
          id: r.id,
          employee: emp ? `${emp.fullName} (${emp.employeeId})` : r.employeeId,
          date: r.date,
          clockIn: r.clockIn,
          clockOut: r.clockOut || '',
          hoursWorked: r.hoursWorked ?? '',
          status: r.status,
          notes: r.notes || '',
        };
      }),
      `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const presentCount = filteredRecords.filter((r) => r.status === 'present').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'absent' || r.status === 'half_day').length;
  const totalShown = filteredRecords.length;

  const departments = Array.from(
    new Set(Array.from(employees.values()).map((e) => e.department).filter(Boolean))
  ).sort();

  const grandTotal = Math.max(1, presentCount + lateCount + absentCount);

  const summaryCards = [
    {
      label: { en: 'Present', ar: 'حاضر' },
      value: presentCount,
      icon: UserCheck,
      color: 'bg-success/10 text-success',
      pct: Math.round((presentCount / grandTotal) * 100),
      barColor: 'bg-success',
    },
    {
      label: { en: 'Late', ar: 'متأخر' },
      value: lateCount,
      icon: AlarmClock,
      color: 'bg-warning/10 text-warning',
      pct: Math.round((lateCount / grandTotal) * 100),
      barColor: 'bg-warning',
    },
    {
      label: { en: 'Absent / Half Day', ar: 'غائب / نصف يوم' },
      value: absentCount,
      icon: UserX,
      color: 'bg-error/10 text-error',
      pct: Math.round((absentCount / grandTotal) * 100),
      barColor: 'bg-error',
    },
    {
      label: { en: 'Total Records', ar: 'إجمالي السجلات' },
      value: totalShown,
      icon: CalendarClock,
      color: 'bg-info/10 text-info',
      pct: 100,
      barColor: 'bg-info',
    },
  ];

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
    { key: 'date', header: t('Date', 'التاريخ', language), render: (r) => formatDate(r.date, language) },
    { key: 'clockIn', header: t('Clock In', 'الحضور', language), render: (r) => r.clockIn },
    {
      key: 'clockOut',
      header: t('Clock Out', 'الانصراف', language),
      render: (r) => r.clockOut || <span className="text-gray-400">--</span>,
    },
    {
      key: 'hoursWorked',
      header: t('Hours', 'الساعات', language),
      render: (r) =>
        r.hoursWorked != null ? (
          <span className="font-medium text-gray-900">{r.hoursWorked.toFixed(2)}</span>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
    {
      key: 'location',
      header: t('Location', 'الموقع', language),
      render: (r) =>
        r.location ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            <MapPin className="h-3 w-3" />
            {r.location.lat.toFixed(4)}, {r.location.lng.toFixed(4)}
          </span>
        ) : (
          <span className="text-gray-300">--</span>
        ),
    },
    {
      key: 'status',
      header: t('Status', 'الحالة', language),
      render: (r) => <Badge status={r.status} locale={language} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title={t('Attendance', 'الحضور والانصراف', language)}
        subtitle={t('Track attendance and working hours', 'تتبع الحضور والانصراف وساعات العمل', language)}
      />

      {message && (
        <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm animate-fade-in">
          {message}
        </div>
      )}

      <Card>
        <CardBody className="py-3">
          <Toolbar>
            <Filter className="h-4 w-4 text-gray-400" />
            <ToolbarInput
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label={t('Filter by date', 'تصفية حسب التاريخ', language)}
            />
            <ToolbarSelect
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label={t('Filter by department', 'تصفية حسب القسم', language)}
            >
              <option value="all">{t('All Departments', 'كل الأقسام', language)}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </ToolbarSelect>
            {(dateFilter || departmentFilter !== 'all') && (
              <button
                onClick={() => {
                  setDateFilter('');
                  setDepartmentFilter('all');
                }}
                className="rounded-md px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
              >
                {t('Clear', 'مسح', language)}
              </button>
            )}
          </Toolbar>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => {
          const Icon = s.icon;
          return (
            <DashboardTile
              key={s.label.en}
              icon={Icon}
              label={t(s.label.en, s.label.ar, language)}
              value={String(s.value)}
              chip={`${s.pct}%`}
              chipClassName={s.color}
              iconClassName={`${s.color} transition-transform group-hover:scale-110`}
              pct={s.pct}
              barClassName={s.barColor}
              className="hover:-translate-y-0.5 hover:shadow-md"
            />
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {t('My Day', 'يومي', language)}
                </h3>
                {todayRecord && <Badge status={todayRecord.status} locale={language} />}
              </div>
              <p className="text-xs text-gray-500">
                {todayRecord
                  ? `${todayRecord.clockIn} – ${todayRecord.clockOut || '--'}${
                      todayRecord.hoursWorked != null ? ` · ${todayRecord.hoursWorked.toFixed(2)} ${t('hrs', 'ساعات', language)}` : ''
                    }${todayRecord?.location ? ' · GPS' : ''}`
                  : t('No record yet today', 'لا يوجد تسجيل بعد اليوم', language)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              onClick={handleClockIn}
              loading={clocking}
              disabled={!!todayRecord?.clockIn}
              variant={todayRecord?.clockIn ? 'outline' : 'primary'}
              title={todayRecord?.clockIn ? t('Already Clocked In', 'تم تسجيل الحضور', language) : t('Clock In', 'تسجيل حضور', language)}
              aria-label={todayRecord?.clockIn ? t('Already Clocked In', 'تم تسجيل الحضور', language) : t('Clock In', 'تسجيل حضور', language)}
            >
              <LogIn className="h-4 w-4" />
              {t('Clock In', 'تسجيل الحضور', language)}
            </Button>
            <Button
              onClick={handleClockOut}
              loading={clocking}
              disabled={!todayRecord?.clockIn || !!todayRecord?.clockOut}
              variant={todayRecord?.clockOut ? 'outline' : 'warning'}
              title={todayRecord?.clockOut ? t('Already Clocked Out', 'تم تسجيل الانصراف', language) : t('Clock Out', 'تسجيل انصراف', language)}
              aria-label={todayRecord?.clockOut ? t('Already Clocked Out', 'تم تسجيل الانصراف', language) : t('Clock Out', 'تسجيل انصراف', language)}
            >
              <LogOut className="h-4 w-4" />
              {t('Clock Out', 'تسجيل الانصراف', language)}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Attendance Records', 'سجل الحضور', language)}
          </h2>
          <div className="flex-1" />
          <Button variant="ghost" onClick={exportCsv} title={t('Export CSV', 'تصدير CSV', language)} aria-label={t('Export CSV', 'تصدير CSV', language)}>
            <Download className="h-4 w-4" />
          </Button>
          <ModuleSettingsMenu
            module={t('Attendance', 'الحضور', language)}
            onExport={exportCsv}
          />
        </CardHeader>
        <CardBody>
          <DataTable
            columns={columns}
            data={filteredRecords}
            loading={loading}
            locale={language}
            dir={dir}
            getRowKey={(r) => r.id}
            filters={{
              key: 'status',
              label: 'Status',
              labelAr: 'الحالة',
              options: [
                { value: 'present', label: 'Present', labelAr: 'حاضر' },
                { value: 'late', label: 'Late', labelAr: 'متأخر' },
                { value: 'absent', label: 'Absent', labelAr: 'غائب' },
                { value: 'half_day', label: 'Half Day', labelAr: 'نصف يوم' },
                { value: 'overtime', label: 'Overtime', labelAr: 'إضافي' },
              ],
              getValue: (r) => r.status,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
