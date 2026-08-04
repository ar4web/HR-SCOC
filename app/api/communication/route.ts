import { NextResponse } from 'next/server';
import { getMessages, sendMessage, getAnnouncements, createAnnouncement } from '@/lib/communication-engine';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'messages';

  if (type === 'announcements') {
    return NextResponse.json({ data: getAnnouncements() });
  }

  return NextResponse.json({ data: getMessages() });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type === 'message') {
    const msg = sendMessage(body.senderId, body.senderName, body.content);
    return NextResponse.json(msg, { status: 201 });
  }

  if (body.type === 'announcement') {
    const ann = createAnnouncement(body);
    return NextResponse.json(ann, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
