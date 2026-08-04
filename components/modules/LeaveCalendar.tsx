'use client';

import React from 'react';
import { LeaveRequest, Employee } from '@/types';
import { getLeaveTypeLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaveCalendarProps {
  leaves: LeaveRequest[];
  employees: Map<string, Employee>;
  locale?: 'en' | 'ar';
  dir?: 'ltr' | 'rtl';
}

const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekDaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const monthNamesEn = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthNamesAr = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const typeColors: Record<string, string> = {
  annual: 'bg-primary/15 text-primary border-primary/20',
  sick: 'bg-error/10 text-error border-error/20',
  personal: 'bg-warning/10 text-warning border-warning/20',
  emergency: 'bg-info/10 text-info border-info/20',
  maternity: 'bg-secondary/10 text-secondary border-secondary/20',
  paternity: 'bg-secondary/10 text-secondary border-secondary/20',
  hajj: 'bg-accent/10 text-accent-800 border-accent/30',
  unpaid: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function LeaveCalendar({ leaves, employees, locale = 'en', dir = 'ltr' }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLeaves = leaves.filter((l) => {
    const start = new Date(l.startDate);
    return start.getMonth() === month && start.getFullYear() === year;
  });

  const leavesByDay: Record<number, LeaveRequest[]> = {};
  monthLeaves.forEach((l) => {
    const day = new Date(l.startDate).getDate();
    if (!leavesByDay[day]) leavesByDay[day] = [];
    leavesByDay[day].push(l);
  });

  const weekDays = locale === 'ar' ? weekDaysAr : weekDaysEn;
  const monthNames = locale === 'ar' ? monthNamesAr : monthNamesEn;

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (dir === 'prev') next.setMonth(next.getMonth() - 1);
      else next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getEmployeeName = (leave: LeaveRequest) => {
    const emp = employees.get(leave.employeeId);
    if (!emp) return leave.employeeId;
    return locale === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('prev')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() => navigate('next')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-[70px] rounded-lg border p-1 ${
              day === null
                ? 'border-transparent bg-transparent'
                : 'border-gray-100 bg-white'
            }`}
          >
            {day !== null && (
              <>
                <div className="text-xs font-medium text-gray-500 mb-1">{day}</div>
                <div className="space-y-0.5">
                  {(leavesByDay[day] || []).slice(0, 2).map((leave) => (
                    <div
                      key={leave.id}
                      className={`text-[10px] px-1 py-0.5 rounded border truncate ${typeColors[leave.type] || typeColors.annual}`}
                      title={`${getEmployeeName(leave)} - ${getLeaveTypeLabel(leave.type, locale)} (${leave.status})`}
                    >
                      {getEmployeeName(leave)}
                    </div>
                  ))}
                  {(leavesByDay[day] || []).length > 2 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{(leavesByDay[day] || []).length - 2} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
