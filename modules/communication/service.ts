import { api } from '@/lib/api';
import { Channel, Message, MessageAttachment } from '@/types';

export interface Announcement {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  author: string;
  createdAt: string;
  priority: 'normal' | 'high' | 'urgent';
}

export const communicationService = {
  getMessages: () => api.get<{ data: Message[] }>('/communication?type=messages'),

  getChannels: () => api.get<{ data: Channel[] }>('/communication?type=channels'),

  sendMessage: (
    senderId: string,
    senderName: string,
    content: string,
    attachment?: MessageAttachment,
    recipientId?: string,
    channelId?: string
  ) =>
    api.post<Message>('/communication', { type: 'message', senderId, senderName, content, attachment, recipientId, channelId }),

  createChannel: (data: { name: string; description?: string; companyId: string; memberIds: string[]; createdBy: string }) =>
    api.post<Channel>('/communication', { type: 'channel', ...data }),

  editMessage: (id: string, content: string) => api.put<Message>('/communication', { id, action: 'edit', content }),

  deleteMessage: (id: string) => api.put<Message>('/communication', { id, action: 'delete' }),

  reactToMessage: (id: string, userId: string, emoji: string) => api.put<Message>('/communication', { id, action: 'react', userId, emoji }),

  getAnnouncements: () => api.get<{ data: Announcement[] }>('/communication?type=announcements'),

  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) =>
    api.post<Announcement>('/communication', { type: 'announcement', ...data }),
};