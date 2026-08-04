import { api } from '@/lib/api';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

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

  sendMessage: (senderId: string, senderName: string, content: string) =>
    api.post<Message>('/communication', { type: 'message', senderId, senderName, content }),

  getAnnouncements: () => api.get<{ data: Announcement[] }>('/communication?type=announcements'),

  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) =>
    api.post<Announcement>('/communication', { type: 'announcement', ...data }),
};
