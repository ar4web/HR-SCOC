import { NextResponse } from 'next/server';
import { getReminders, getReminderSummary } from '@/lib/reminders-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { employees, users, addNotification, addOutboundEmail, persistData, addManualReminder } from '@/lib/mock-data';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { items, dormant } = getReminders();

  if (!hasPermission(auth.role, 'employee:view_all') && auth.role !== 'manager') {
    const own = employees.get(auth.employeeId || '') || Array.from(employees.values()).find((e) => e.userId === auth.sub);
    const ownId = own?.id;
    const scoped = items.filter((i) => !i.employeeId || i.employeeId === ownId);
    const scopedDormant = dormant.filter((i) => !i.employeeId || i.employeeId === ownId);
    return NextResponse.json({
      data: scoped,
      dormant: scopedDormant,
      summary: {
        expired: scoped.filter((i) => i.status === 'expired').length,
        expiring: scoped.filter((i) => i.status === 'expiring').length,
        total: scoped.length,
      },
      scoped: true,
    });
  }

  return NextResponse.json({ data: items, dormant, summary: getReminderSummary() });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  const body = await req.json();

  if (body?.create) {
    const name = String(body.name || '').trim();
    const dueDate = String(body.dueDate || '');
    if (!name || !dueDate) {
      return NextResponse.json({ error: 'name and dueDate are required' }, { status: 400 });
    }
    const reminder = addManualReminder({ name, nameAr: body.nameAr ? String(body.nameAr) : undefined, dueDate });
    persistData();
    return NextResponse.json({ success: true, reminder });
  }

  const reminderId = String(body?.reminderId || '');
  if (!reminderId) return NextResponse.json({ error: 'reminderId is required' }, { status: 400 });

  const { items } = getReminders();
  const item = items.find((i) => i.id === reminderId);
  if (!item) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });

  const created: string[] = [];

  const push = (userId: string) => {
    addNotification({
      companyId: 'demo-company',
      userId,
      title: `Reminder: ${item.kindLabel.en} expiring`,
      titleAr: `تذكير: ${item.kindLabel.ar} يقترب من انتهاء الصلاحية`,
      message: `${item.name} — ${item.status === 'expired' ? 'expired on' : 'expires in'} ${item.status === 'expired' ? item.dueDate : `${item.daysLeft} day(s)`}`,
      messageAr: `${item.status === 'expired' ? 'انتهى في' : 'ينتهي خلال'} ${item.status === 'expired' ? item.dueDate : `${item.daysLeft} يوماً`} — ${item.name}`,
      type: item.status === 'expired' ? 'error' : 'warning',
      read: false,
      link: '/todos?tab=reminders',
    });
    created.push(userId);
  };

  if (item.employeeId) {
    const emp = employees.get(item.employeeId);
    if (emp?.userId) {
      push(emp.userId);
    } else {
      push('user-1');
    }
  } else if (item.owner === 'All Employees' || !item.owner) {
    for (const u of users.values()) {
      if (u.role === 'employee') push(u.id);
    }
  }

  if (item.kind !== 'document') {
    const emp = item.employeeId ? employees.get(item.employeeId) : null;
    if (emp) {
      addOutboundEmail({
        toName: emp.fullName,
        toEmail: emp.email,
        subject: `Reminder: ${item.kindLabel.en} expiring`,
        body: `Dear ${emp.fullName},\n\nThis is a reminder that your ${item.kindLabel.en.toLowerCase()} is ${
          item.status === 'expired' ? `expired on ${item.dueDate}` : `expiring in ${item.daysLeft} days (${item.dueDate})`
        }.\n\nPlease take the necessary action.\n\nHR Department`,
        createdBy: auth?.sub,
      });
    }
  }

  persistData();
  return NextResponse.json({ success: true, notified: created.length });
}