import { NextResponse } from 'next/server';
import { notifications, addNotification } from '@/lib/mock-data';
import { Notification } from '@/types';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const userId = resolveUserId(authHeader);

  const list = Array.from(notifications.values())
    .filter((n) => !userId || n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = list.filter((n) => !n.read).length;

  return NextResponse.json({ data: list, unreadCount, total: list.length });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const userId = resolveUserId(authHeader);

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
    userId: body.userId || userId || 'user-1',
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

function resolveUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(authHeader.slice(7)));
    return payload.userId || null;
  } catch {
    return null;
  }
}
