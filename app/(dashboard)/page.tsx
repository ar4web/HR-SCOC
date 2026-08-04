'use client';
import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { t, formatCurrency } from '@/lib/utils';
import { reportsService, DashboardStats } from '@/modules/reports/service';
import { attendanceService } from '@/modules/attendance/service';
import { Attendance } from '@/types';
import {
  Users, CalendarClock, DollarSign, UserCheck, TrendingUp, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Stat {
  label: { en: string; ar: string };
  value: string;
  change: string;
  up: boolean;
  icon: LucideIcon;
  color: string;
}

const deptColors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-info'];

export default function DashboardPage() {
  const { language } = useLanguageStore();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [statsRes, attRes] = await Promise.all([
      reportsService.getStats(),
      attendanceService.list(),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (attRes.success && attRes.data) setAttendance(attRes.data.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return null;

  const today = new Date().toISOString().split('T')[0];
  const presentToday = attendance.filter((a) => a.date === today && a.status !== 'absent').length;
  const presentPct = stats.totalEmployees > 0 ? Math.round((presentToday / stats.totalEmployees) * 100) : 0;

  const statsCards: Stat[] = [
    {
      label: { en: 'Total Employees', ar: 'إجمالي الموظفين' },
      value: stats.totalEmployees.toString(),
      change: stats.activeEmployees.toString(),
      up: true,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: { en: 'Pending Leaves', ar: 'الإجازات المعلقة' },
      value: stats.pendingLeaves.toString(),
      change: stats.leaveStatus.find((l) => l.name === 'approved')?.count.toString() || '0',
      up: false,
      icon: CalendarClock,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      label: { en: 'Monthly Payroll', ar: 'الرواتب الشهرية' },
      value: formatCurrency(stats.totalPayroll),
      change: formatCurrency(stats.avgSalary),
      up: true,
      icon: DollarSign,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: { en: 'Present Today', ar: 'الحاضرون اليوم' },
      value: `${presentToday} / ${stats.totalEmployees}`,
      change: `${presentPct}%`,
      up: true,
      icon: UserCheck,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const pendingLeaves = stats.pendingLeaves;
  const alerts = [
    {
      text: {
        en: `${pendingLeaves} leave request${pendingLeaves === 1 ? '' : 's'} awaiting approval`,
        ar: `${pendingLeaves} طلب إجازة بانتظار الموافقة`,
      },
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-100',
      show: pendingLeaves > 0,
    },
    {
      text: {
        en: `${stats.activeEmployees} of ${stats.totalEmployees} employees are active`,
        ar: `${stats.activeEmployees} من أصل ${stats.totalEmployees} موظف نشط`,
      },
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-100',
      show: true,
    },
    {
      text: {
        en: 'Track attendance and process payroll from the modules menu',
        ar: 'تابع الحضور وعالج الرواتب من قائمة الوحدات',
      },
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      show: true,
    },
  ].filter((a) => a.show);

  const departmentData = stats.departmentDistribution;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('Dashboard', 'لوحة القيادة', language)}</h1>
          <p className="text-sm text-gray-500">{t('Welcome to SCOS HR platform', 'مرحباً بك في منصة سكوس للموارد البشرية', language)}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {t('Live', 'مباشر', language)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label.en} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-semibold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>{s.change}</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{t(s.label.en, s.label.ar, language)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">
            {t('Headcount by Department', 'عدد الموظفين حسب القسم', language)}
          </h2>
          <div className="mt-6 space-y-4">
            {departmentData.length === 0 ? (
              <p className="text-sm text-gray-500">{t('No department data yet', 'لا توجد بيانات أقسام بعد', language)}</p>
            ) : (
              departmentData.map((d, i) => (
                <div key={d.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{d.name}</span>
                    <span className="text-gray-500">{d.count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2.5 rounded-full ${deptColors[i % deptColors.length]}`}
                      style={{ width: `${stats.totalEmployees > 0 ? Math.round((d.count / stats.totalEmployees) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {t('Attention Needed', 'يحتاج إلى انتباه', language)}
          </h2>
          <div className="mt-4 space-y-3">
            {alerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-700">{t(a.text.en, a.text.ar, language)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
