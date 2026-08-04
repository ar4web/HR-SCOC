import { Message, Announcement } from '@/types';
import { messages, announcements, addMessage, addAnnouncement } from '@/lib/mock-data';

export type { Message, Announcement };

export function getMessages(): Message[] {
  return Array.from(messages.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function sendMessage(senderId: string, senderName: string, content: string): Message {
  return addMessage({ senderId, senderName, content });
}

export function getAnnouncements(): Announcement[] {
  return Array.from(announcements.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
  return addAnnouncement(data);
}
