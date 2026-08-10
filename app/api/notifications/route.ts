import { NextResponse } from 'next/server';
import { notifications, addNotification, persistData } from '@/lib/mock-data';
import { authFromRequest } from '@/lib/rbac';
import { Notification } from '@/types';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  const userId = auth?.sub || null;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const unreadOnly = searchParams.get('unread') === 'true';

  let list = Array.from(notifications.values())
    .filter((n) => !userId || n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (type && type !== 'all') list = list.filter((n) => n.type === type);
  if (unreadOnly) list = list.filter((n) => !n.read);

  const unreadCount = list.filter((n) => !n.read).length;
  const total = Array.from(notifications.values()).filter((n) => !userId || n.userId === userId).length;

  return NextResponse.json({ data: list, unreadCount, total });
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  const body = await req.json();

  if (body.markAll) {
    let changed = false;
    for (const n of notifications.values()) {
      if (!n.read && (!auth || n.userId === auth.sub)) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) persistData();
    return NextResponse.json({ success: true });
  }

  if (body.id && typeof body.read === 'boolean') {
    const n = notifications.get(body.id);
    if (!n) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    if (auth && n.userId !== auth.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    n.read = body.read;
    persistData();
    return NextResponse.json(n);
  }

  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  let body: Partial<Notification>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.title || !body.titleAr) {
    return NextResponse.json({ error: 'title and titleAr are required' }, { status: 400 });
  }

  const notification = addNotification({
    companyId: body.companyId || 'demo-company',
    userId: body.userId || auth?.sub || 'user-1',
    title: body.title,
    titleAr: body.titleAr,
    message: body.message || '',
    messageAr: body.messageAr || '',
    type: body.type || 'info',
    read: false,
    link: body.link,
  });

  return NextResponse.json(notification);
}