import { Message, MessageAttachment, Announcement, Channel } from '@/types';
import { messages, channels, announcements, addMessage, addAnnouncement, addChannel, editMessage, deleteMessage, reactToMessage, persistData } from '@/lib/mock-data';

export type { Message, MessageAttachment, Announcement, Channel };

export function getMessages(): Message[] {
  return Array.from(messages.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getChannels(): Channel[] {
  return Array.from(channels.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function sendMessage(
  senderId: string,
  senderName: string,
  content: string,
  attachment?: MessageAttachment,
  recipientId?: string,
  channelId?: string
): Message {
  return addMessage({ senderId, senderName, content, attachment, recipientId, channelId });
}

export function updateMessageContent(id: string, content: string): Message | null {
  const updated = editMessage(id, content);
  if (updated) persistData();
  return updated;
}

export function removeMessage(id: string): Message | null {
  const removed = deleteMessage(id);
  if (removed) persistData();
  return removed;
}

export function toggleReaction(id: string, userId: string, emoji: string): Message | null {
  const updated = reactToMessage(id, userId, emoji);
  if (updated) persistData();
  return updated;
}

export function createChannel(data: Omit<Channel, 'id' | 'createdAt'>): Channel {
  const c = addChannel(data);
  persistData();
  return c;
}

export function getThread(userId: string, contactId: string): Message[] {
  return getMessages().filter(
    (m) =>
      (m.senderId === userId && m.recipientId === contactId) ||
      (m.senderId === contactId && m.recipientId === userId) ||
      (m.senderId === contactId && !m.recipientId && m.senderId !== userId)
  );
}

export function getConversations(userId: string): Map<string, Message[]> {
  const grouped = new Map<string, Message[]>();
  for (const m of getMessages()) {
    if (m.senderId === userId) {
      const other = m.recipientId || 'general';
      const list = grouped.get(other) || [];
      list.push(m);
      grouped.set(other, list);
    } else if (m.senderId !== userId) {
      const other = m.senderId;
      const list = grouped.get(other) || [];
      list.push(m);
      grouped.set(other, list);
    }
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  return grouped;
}

export function getAnnouncements(): Announcement[] {
  return Array.from(announcements.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  return addAnnouncement(data);
}