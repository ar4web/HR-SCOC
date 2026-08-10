export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import {
  getMessages,
  getChannels,
  sendMessage,
  getAnnouncements,
  createAnnouncement,
  updateMessageContent,
  removeMessage,
  toggleReaction,
  createChannel,
} from '@/lib/communication-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { parseWith, messageSchema, announcementSchema, channelSchema } from '@/lib/validation';
import type { MessageAttachment } from '@/types';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'messages';

  if (type === 'announcements') {
    return NextResponse.json({ data: getAnnouncements() });
  }

  if (type === 'channels') {
    return NextResponse.json({ data: getChannels() });
  }

  return NextResponse.json({ data: getMessages() });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.type === 'message') {
    const parsed = parseWith(messageSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const attachment = parsed.data.attachment
      ? ({ ...parsed.data.attachment, type: parsed.data.attachment.type ?? 'file' } as MessageAttachment)
      : undefined;
    const msg = sendMessage(
      String(parsed.data.senderId ?? auth.sub),
      String(parsed.data.senderName ?? ''),
      String(parsed.data.content ?? ''),
      attachment,
      parsed.data.recipientId,
      parsed.data.channelId
    );
    return NextResponse.json(msg, { status: 201 });
  }

  if (body.type === 'announcement') {
    if (!hasPermission(auth.role, 'employee:manage')) {
      return NextResponse.json({ error: 'Forbidden: HR only' }, { status: 403 });
    }
    const parsed = parseWith(announcementSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const ann = createAnnouncement(parsed.data as unknown as Parameters<typeof createAnnouncement>[0]);
    return NextResponse.json(ann, { status: 201 });
  }

  if (body.type === 'channel') {
    const parsed = parseWith(channelSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const channel = createChannel(parsed.data as unknown as Parameters<typeof createChannel>[0]);
    return NextResponse.json(channel, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, action, content, emoji } = body;
  const strId = typeof id === 'string' ? id : '';

  if (!strId) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  if (action === 'edit' || action === 'delete') {
    const existing = getMessages().find((m) => m.id === strId);
    const isAuthor = existing?.senderId === auth.sub;
    const isMod = hasPermission(auth.role, 'settings:manage');
    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: 'Forbidden: not the author' }, { status: 403 });
    }
    if (action === 'edit') {
      const updated = updateMessageContent(strId, String(content ?? ''));
      if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      return NextResponse.json(updated);
    }
    const removed = removeMessage(strId);
    if (!removed) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    return NextResponse.json(removed);
  }

  if (action === 'react') {
    if (!emoji) return NextResponse.json({ error: 'emoji is required' }, { status: 400 });
    const updated = toggleReaction(strId, auth.sub, String(emoji));
    if (!updated) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
