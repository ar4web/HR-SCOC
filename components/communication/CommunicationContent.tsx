'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { employeeService } from '@/modules/employee-management/service';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { communicationService, Announcement } from '@/modules/communication/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';

import { Channel, Message, MessageAttachment } from '@/types';
import { clearApiCache } from '@/lib/api';
import Image from 'next/image';
import { t, formatDate, getPriorityLabel } from '@/lib/utils';
import {
  MessageSquare, Megaphone, Send, Paperclip, Image as ImageIcon, Camera, ChevronLeft, FileText, X, Smile, Hash, Pencil, Trash2,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { usePageSearch } from '@/stores/search-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Contact {
  id: string;
  name: string;
  nameAr?: string;
  position?: string;
}

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-warning', 'bg-info', 'bg-success', 'bg-error'];

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return avatarColors[hash % avatarColors.length];
}

function formatTime(iso: string, locale: 'en' | 'ar'): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatListTime(iso: string, locale: 'en' | 'ar'): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso, locale);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' });
}

export function CommunicationContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [tab, setTab] = React.useState<'chat' | 'announcements'>('chat');

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string>('');
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [pendingAtt, setPendingAtt] = React.useState<MessageAttachment | null>(null);
  const contactSearch = usePageSearch('/communication', 'Search people…', 'ابحث عن أشخاص…');
  const [mobileThread, setMobileThread] = React.useState(false);
  const [showEmoji, setShowEmoji] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const threadRef = React.useRef<HTMLDivElement>(null);
  const lastSeenRef = React.useRef<Record<string, string>>({});
  const [lastSeen, setLastSeen] = React.useState<Record<string, string>>({});

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [annForm, setAnnForm] = React.useState({
    title: '', titleAr: '', content: '', contentAr: '', priority: 'normal' as Announcement['priority'],
  });
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<Channel | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState('');
  const [reactMenuId, setReactMenuId] = React.useState<string | null>(null);

  const myId = user?.id || 'user-1';
  const myName = user?.name || 'Admin User';

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('scos_chat_lastseen');
      if (raw) {
        lastSeenRef.current = JSON.parse(raw);
        setLastSeen(lastSeenRef.current);
      }
    } catch { /* ignore */ }
  }, []);

  const persistLastSeen = (map: Record<string, string>) => {
    lastSeenRef.current = map;
    setLastSeen(map);
    try {
      localStorage.setItem('scos_chat_lastseen', JSON.stringify(map));
    } catch { /* ignore */ }
  };

  const load = React.useCallback(async () => {
    try {
      const [msgRes, annRes, empRes, chanRes] = await Promise.all([
        communicationService.getMessages(),
        communicationService.getAnnouncements(),
        employeeService.list({ pageSize: 100 }),
        communicationService.getChannels(),
      ]);
      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data.data);
      }
      if (annRes.success && annRes.data) setAnnouncements(annRes.data.data);
      if (chanRes.success && chanRes.data) setChannels(chanRes.data.data);
      if (empRes.success && empRes.data) {
        const emps = empRes.data.data;
        setContacts((prev) => {
          const ids = new Set(emps.map((e) => e.id));
          return [...prev.filter((c) => !ids.has(c.id)), ...emps.map((e) => ({ id: e.id, name: e.fullName, nameAr: e.fullNameAr, position: e.position }))];
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    let inFlight = false;
    const poll = setInterval(() => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      clearApiCache('/communication');
      communicationService.getMessages()
        .then((res) => {
          if (res.success && res.data) {
            setMessages((prev) => {
              if (prev.length === res.data!.data.length) return prev;
              return res.data!.data;
            });
          }
        })
        .finally(() => { inFlight = false; });
    }, 4000);
    return () => clearInterval(poll);
  }, [load]);

  const conversations = React.useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const m of messages) {
      if (m.channelId) {
        const key = `channel:${m.channelId}`;
        const list = map.get(key) || [];
        list.push(m);
        map.set(key, list);
        continue;
      }
      const other = m.senderId === myId ? m.recipientId || 'general' : m.senderId;
      const list = map.get(other) || [];
      list.push(m);
      map.set(other, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return map;
  }, [messages, myId]);

  const contactById = React.useCallback(
    (id: string): Contact | undefined => {
      if (id === 'general') return { id: 'general', name: 'General' };
      return contacts.find((c) => c.id === id);
    },
    [contacts]
  );

  const allContacts = React.useMemo(() => {
    const known = new Set<string>(['system', 'general']);
    for (const [id, list] of conversations) {
      known.add(id);
      list.forEach((m) => known.add(m.senderId === myId ? m.recipientId || 'general' : m.senderId));
    }
    const list: Contact[] = [];
    for (const id of known) {
      if (id === myId) continue;
      if (id === 'system') {
        list.push({ id: 'system', name: 'SCOCS Bot', position: 'Assistant' });
        continue;
      }
      const msgs = conversations.get(id) || [];
      if (msgs.length > 0) {
        const from = msgs.find((m) => m.senderId !== myId);
        list.push({
          id,
          name: contactById(id)?.name || (from ? from.senderName : 'Unknown'),
          nameAr: contactById(id)?.nameAr,
          position: contactById(id)?.position,
        });
      }
    }
    const contactIds = new Set(list.map((c) => c.id));
    for (const c of contacts) {
      if (!contactIds.has(c.id)) list.push(c);
    }
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [contacts, conversations, contactById, myId]);

  const filteredContacts = React.useMemo(() => {
    const q = contactSearch.toLowerCase();
    if (!q) return allContacts;
    return allContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.nameAr || '').includes(contactSearch) || (c.position || '').toLowerCase().includes(q)
    );
  }, [allContacts, contactSearch]);

  const channelMessages = React.useMemo(() => {
    if (!activeChannel) return [];
    const key = `channel:${activeChannel.id}`;
    return conversations.get(key) || [];
  }, [conversations, activeChannel]);

  const activeMessages = React.useMemo(() => {
    if (activeChannel) return channelMessages;
    if (!activeId) return [];
    return conversations.get(activeId) || [];
  }, [conversations, activeId, activeChannel, channelMessages]);

  const activeContact = !activeChannel
    ? (activeId ? contactById(activeId) || allContacts.find((c) => c.id === activeId) : undefined)
    : undefined;

  const isOnline = React.useCallback(
    (contactId: string): boolean => {
      if (contactId === 'system') return true;
      const msgs = conversations.get(contactId) || [];
      if (msgs.length === 0) return false;
      const last = msgs[msgs.length - 1];
      if (last.senderId === myId) return false;
      return Date.now() - new Date(last.timestamp).getTime() < 10 * 60 * 1000;
    },
    [conversations, myId]
  );

  const unreadCount = (contactId: string): number => {
    const list = conversations.get(contactId) || [];
    const last = lastSeen[contactId] || '';
    return list.filter((m) => m.senderId !== myId && (!last || m.timestamp > last)).length;
  };

  const openThread = (contactId: string) => {
    setActiveId(contactId);
    setMobileThread(true);
    const list = conversations.get(contactId) || [];
    const latest = list.length > 0 ? list[list.length - 1].timestamp : new Date().toISOString();
    persistLastSeen({ ...lastSeenRef.current, [contactId]: latest });
  };

  React.useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [activeMessages.length, activeId]);

  const sendNow = async (content: string, attachment?: MessageAttachment | null, recipientId = activeId) => {
    const targetChannel = activeChannel;
    if (!recipientId && !targetChannel) return;
    if (!content.trim() && !attachment) return;
    setSending(true);
    const res = await communicationService.sendMessage(
      myId, myName, content.trim(), attachment || undefined,
      targetChannel ? undefined : recipientId,
      targetChannel?.id
    );
    setSending(false);
    if (res.success && res.data) {
      clearApiCache('/communication');
      setDraft('');
      setPendingAtt(null);
      setShowEmoji(false);
      setEditingId(null);
      setEditingText('');
      const m = res.data;
      setMessages((prev) => [...prev, m]);
      if (targetChannel) {
        setActiveChannel((prev) => prev);
      } else if (!conversations.has(recipientId)) {
        openThread(recipientId);
      }
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to send message', 'فشل إرسال الرسالة', language) });
    }
  };

  const handleSend = () => sendNow(draft, pendingAtt);

  const openChannel = (ch: Channel) => {
    setActiveChannel(ch);
    setActiveId('');
    setMobileThread(true);
    setEditingId(null);
    setEditingText('');
    const key = `channel:${ch.id}`;
    const list = conversations.get(key) || [];
    const latest = list.length > 0 ? list[list.length - 1].timestamp : new Date().toISOString();
    persistLastSeen({ ...lastSeenRef.current, [key]: latest });
  };

  const openDirect = (contactId: string) => {
    setActiveChannel(null);
    openThread(contactId);
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setEditingText(m.content);
    setReactMenuId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async (m: Message) => {
    if (!editingText.trim()) return;
    const res = await communicationService.editMessage(m.id, editingText.trim());
    if (res.success && res.data) {
      clearApiCache('/communication');
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.data! : x)));
      cancelEdit();
      addToast({ type: 'success', title: t('Message updated', 'تم تحديث الرسالة', language) });
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to edit message', 'فشل تعديل الرسالة', language) });
    }
  };

  const [confirmTarget, setConfirmTarget] = React.useState<Message | null>(null);

  const handleDelete = async (m: Message) => {
    setConfirmTarget(null);
    const res = await communicationService.deleteMessage(m.id);
    if (res.success && res.data) {
      clearApiCache('/communication');
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.data! : x)));
      addToast({ type: 'success', title: t('Message deleted', 'تم حذف الرسالة', language) });
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete message', 'فشل حذف الرسالة', language) });
    }
  };

  const handleReact = async (m: Message, emoji: string) => {
    const res = await communicationService.reactToMessage(m.id, myId, emoji);
    setReactMenuId(null);
    if (res.success && res.data) {
      clearApiCache('/communication');
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.data! : x)));
    }
  };

  const readFile = (file: File, kind: 'image' | 'file') => {
    if (file.size > 4 * 1024 * 1024) {
      addToast({ type: 'error', title: t('File too large (max 4MB)', 'الملف كبير جداً (الحد الأقصى 4MB)', language) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAtt({ type: kind, name: file.name, url: String(reader.result), size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file, file.type.startsWith('image/') ? 'image' : 'file');
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file, 'image');
    e.target.value = '';
  };

  const handleCreateAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.content.trim()) {
      addToast({ type: 'error', title: t('Title and content are required', 'العنوان والمحتوى مطلوبان', language) });
      return;
    }
    const res = await communicationService.createAnnouncement({
      title: annForm.title.trim(),
      titleAr: annForm.titleAr.trim() || annForm.title.trim(),
      content: annForm.content.trim(),
      contentAr: annForm.contentAr.trim() || annForm.content.trim(),
      author: user?.name || 'System',
      priority: annForm.priority,
    });
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('Announcement created', 'تم إنشاء الإعلان', language) });
      setAnnForm({ title: '', titleAr: '', content: '', contentAr: '', priority: 'normal' });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to create announcement', 'فشل إنشاء الإعلان', language) });
    }
  };

  const priorityStyles: Record<Announcement['priority'], string> = {
    normal: 'bg-gray-100 text-gray-600',
    high: 'bg-warning/10 text-warning',
    urgent: 'bg-error/10 text-error',
  };

  const emojis = ['😀', '😂', '👍', '🙏', '👏', '🎉', '❤️', '🔥', '💪', '👋', '✅', '🙌'];

  const renderBubble = (m: Message) => {
    const mine = m.senderId === myId;
    const deleted = !!m.deletedAt;
    const reactions = m.reactions || [];
    return (
      <div key={m.id} className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine && !deleted && (
          <div className={`h-8 w-8 rounded-full ${colorFor(m.senderName)} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>
            {initials(m.senderName)}
          </div>
        )}
        <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!mine && m.senderId === 'system' && !deleted && (
            <span className="text-[11px] text-gray-400 mb-0.5 px-1">{m.senderName}</span>
          )}
          <div className={`relative rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
            deleted
              ? 'bg-gray-100 text-gray-400 italic'
              : mine ? 'bg-primary text-white rounded-br-md' : 'bg-white shadow-sm text-gray-800 rounded-bl-md'
          }`}>
            {!deleted && m.attachment?.type === 'image' && (
              <Image
                src={m.attachment.url}
                alt={m.attachment.name}
                width={512}
                height={512}
                unoptimized
                className="rounded-xl max-h-64 w-auto mb-2 cursor-pointer"
                onClick={() => window.open(m.attachment!.url, '_blank')}
              />
            )}
            {!deleted && m.attachment?.type === 'file' && (
              <a
                href={m.attachment.url}
                download={m.attachment.name}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-2 text-sm font-medium ${
                  mine ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <FileText className={`h-5 w-5 ${mine ? 'text-white' : 'text-primary'}`} />
                <span className="flex flex-col">
                  <span className={`${mine ? 'text-white' : 'text-gray-900'} max-w-[180px] truncate`}>{m.attachment.name}</span>
                  <span className={`text-[11px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>{formatBytes(m.attachment.size)}</span>
                </span>
              </a>
            )}
            {!deleted && editingId === m.id ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(m);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-1.5">
                  <button onClick={() => saveEdit(m)} className="text-[11px] font-medium text-primary hover:underline">
                    {t('Save', 'حفظ', language)}
                  </button>
                  <button onClick={cancelEdit} className="text-[11px] font-medium text-gray-400 hover:underline">
                    {t('Cancel', 'إلغاء', language)}
                  </button>
                </div>
              </div>
            ) : (
              deleted ? (
                <span>{t('This message was deleted', 'تم حذف هذه الرسالة', language)}</span>
              ) : (
                <span className="whitespace-pre-wrap break-words">{m.content}</span>
              )
            )}
            {!deleted && m.editedAt && (
              <span className={`block text-[10px] mt-0.5 ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                {t('edited', 'تم التعديل', language)}
              </span>
            )}
          </div>

          {!deleted && reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reactions.map((r) => {
                const reacted = r.userIds.includes(myId);
                return (
                  <button
                    key={r.emoji}
                    onClick={() => handleReact(m, r.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                      reacted ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span className="font-semibold">{r.userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          <span className={`text-[10px] text-gray-400 mt-0.5 px-1 ${mine ? 'text-right' : 'text-left'}`}>
            {formatTime(m.timestamp, language)}
          </span>

          {!deleted && (
            <div className={`flex gap-0.5 mt-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="relative">
                <button
                  onClick={() => setReactMenuId(reactMenuId === m.id ? null : m.id)}
                  className="p-0.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100"
                  title={t('React', 'تفاعل', language)}
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {reactMenuId === m.id && (
                  <div className={`absolute bottom-full mb-1 z-20 flex gap-1 bg-white rounded-full shadow-lg px-2 py-1 ${mine ? 'right-0 rtl:left-0' : 'left-0 rtl:right-0'}`}>
                    {['👍', '❤️', '😂', '🎉', '🔥', '👏'].map((e) => (
                      <button key={e} onClick={() => handleReact(m, e)} className="text-base hover:scale-125 transition-transform">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {mine && (
                <>
                  <button
                    onClick={() => startEdit(m)}
                    className="p-0.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100"
                    title={t('Edit', 'تعديل', language)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmTarget(m)}
                    className="p-0.5 rounded text-gray-400 hover:text-error hover:bg-gray-100"
                    title={t('Delete', 'حذف', language)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title={t('Chat', 'الدردشة', language)}
        subtitle={t('Team messaging with images and file attachments', 'مراسلة الفريق مع الصور ومرفقات الملفات', language)}
        actions={
          <>
            <ModuleSettingsMenu module={t('Communication', 'التواصل', language)} />
            <button
              onClick={() => setTab('chat')}
              title={t('Chat', 'الدردشة', language)}
              aria-label={t('Chat', 'الدردشة', language)}
              className={`rounded-md p-2 transition-colors ${
                tab === 'chat' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <MessageSquare className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setTab('announcements')}
              title={t('Announcements', 'الإعلانات', language)}
              aria-label={t('Announcements', 'الإعلانات', language)}
              className={`rounded-md p-2 transition-colors ${
                tab === 'announcements' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              <Megaphone className="h-[18px] w-[18px]" />
            </button>
          </>
        }
      />

      {tab === 'chat' ? (
        <Card className="overflow-hidden">
          <div className="flex h-[calc(100dvh-200px)] min-h-[360px] md:h-[calc(100dvh-260px)] md:min-h-[480px]">
            <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 rtl:border-r-0 rtl:border-l flex flex-col ${mobileThread ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex-1 overflow-y-auto py-2">
                {channels.length > 0 && (
                  <div className="px-3 pt-1 pb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-2 mb-1">
                      {t('Channels', 'القنوات', language)}
                    </p>
                    <div className="space-y-0.5">
                      {channels.map((ch) => {
                        const isActive = activeChannel?.id === ch.id;
                        const key = `channel:${ch.id}`;
                        const unread = unreadCount(key);
                        return (
                          <button
                            key={ch.id}
                            onClick={() => openChannel(ch)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors ${
                              isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <Hash className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium truncate flex-1">{ch.name}</span>
                            {unread > 0 && (
                              <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                                {unread}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {channels.length > 0 && (
                  <div className="px-3 py-1.5">
                    <div className="h-px bg-gray-100" />
                  </div>
                )}

                {filteredContacts.map((c) => {
                  const msgs = conversations.get(c.id) || [];
                  const last = msgs[msgs.length - 1];
                  const unread = unreadCount(c.id);
                  const active = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => openDirect(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active ? 'bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`h-11 w-11 rounded-full ${colorFor(c.name)} text-white flex items-center justify-center font-semibold`}>
                          {initials(c.name)}
                        </div>
                        <span className={`absolute bottom-0 right-0 rtl:right-auto rtl:left-0 h-3 w-3 rounded-full border-2 border-white ${isOnline(c.id) ? 'bg-success' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {language === 'ar' && c.nameAr ? c.nameAr : c.name}
                          </span>
                          {last && (
                            <span className="text-[11px] text-gray-400 shrink-0">{formatListTime(last.timestamp, language)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                            {last ? (last.senderId === myId ? `${t('You', 'أنت', language)}: ` : '') + (last.attachment ? (last.attachment.type === 'image' ? t('📷 Image', '📷 صورة', language) : '📎 ' + last.attachment.name) : last.content) : t('Start chatting', 'ابدأ المحادثة', language)}
                          </span>
                          {unread > 0 && (
                            <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    {t('No conversations yet. Tap a person to start.', 'لا توجد محادثات بعد. اضغط على شخص للبدء.', language)}
                  </p>
                )}
              </div>
            </div>

            <div className={`flex-1 flex flex-col min-w-0 ${mobileThread ? 'flex' : 'hidden md:flex'}`}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
                <button
                  onClick={() => setMobileThread(false)}
                  className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </button>
                {activeContact ? (
                  <>
                    <div className={`h-10 w-10 rounded-full ${colorFor(activeContact.name)} text-white flex items-center justify-center font-semibold shrink-0`}>
                      {initials(activeContact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {language === 'ar' && activeContact.nameAr ? activeContact.nameAr : activeContact.name}
                      </p>
                      <p className="text-xs text-success">
                        {isOnline(activeId) ? t('Online', 'متصل', language) : t('Offline', 'غير متصل', language)}
                      </p>
                    </div>
                  </>
                ) : activeChannel ? (
                  <>
                    <div className={`h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0`}>
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {'#' + activeChannel.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{activeChannel.description}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 text-center text-sm text-gray-400 py-2">
                    {t('Select a conversation to start chatting', 'اختر محادثة لبدء الدردشة', language)}
                  </div>
                )}
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-3">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`h-10 w-2/3 rounded-2xl bg-gray-200`} />
                      </div>
                    ))}
                  </div>
                ) : activeChannel && channelMessages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 pt-16">
                    <p className="text-4xl mb-3">📣</p>
                    <p>{t(`No messages in #${activeChannel.name} yet. Start the conversation!`, `لا توجد رسائل في قناة #${activeChannel.name} بعد. ابدأ المحادثة!`, language)}</p>
                  </div>
                ) : activeId && activeMessages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 pt-16">
                    <p className="text-4xl mb-3">👋</p>
                    <p>{t(`Say hello to ${activeContact?.name || 'this contact'}!`, `قل مرحباً لـ ${activeContact?.name || 'هذا الشخص'}!`, language)}</p>
                  </div>
                ) : !activeId && !activeChannel ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 text-primary/40" />
                    </div>
                    <p className="text-sm">{t('Pick a conversation from the list', 'اختر محادثة من القائمة', language)}</p>
                  </div>
                ) : (
                  activeMessages.map(renderBubble)
                )}
              </div>

              <div className="border-t border-gray-100 bg-white p-3">
                {pendingAtt && (
                  <div className="flex items-center gap-2 mb-2 bg-gray-50 rounded-xl px-3 py-2">
                    {pendingAtt.type === 'image' ? (
                      <Image src={pendingAtt.url} alt={pendingAtt.name} width={40} height={40} unoptimized className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                    <span className="text-xs text-gray-700 truncate flex-1">{pendingAtt.name}</span>
                    <span className="text-[11px] text-gray-400">{formatBytes(pendingAtt.size)}</span>
                    <button onClick={() => setPendingAtt(null)} className="p-1 rounded text-gray-400 hover:text-error">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {showEmoji && (
                  <div className="flex flex-wrap gap-1 mb-2 bg-gray-50 rounded-xl p-2">
                    {emojis.map((e) => (
                      <button key={e} onClick={() => setDraft((d) => d + e)} className="text-xl hover:scale-125 transition-transform">
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-full text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
                    title={t('Attach file', 'إرفاق ملف', language)}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2.5 rounded-full text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
                    title={t('Send image', 'إرسال صورة', language)}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2.5 rounded-full text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
                    title={t('Take a photo', 'التقاط صورة', language)}
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowEmoji((s) => !s)}
                    className={`p-2.5 rounded-full transition-colors ${showEmoji ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                    title={t('Emoji', 'رموز تعبيرية', language)}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={!activeId && !activeChannel}
                    placeholder={activeId || activeChannel ? t('Type a message...', 'اكتب رسالة...', language) : t('Select a conversation first', 'اختر محادثة أولاً', language)}
                    className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!activeId && !activeChannel) || (!draft.trim() && !pendingAtt) || sending}
                    className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('Create Announcement', 'إنشاء إعلان', language)}</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder={t('Title (English)', 'العنوان (إنجليزي)', language)}
                  className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  value={annForm.titleAr}
                  onChange={(e) => setAnnForm({ ...annForm, titleAr: e.target.value })}
                  placeholder={t('Title (Arabic)', 'العنوان (عربي)', language)}
                  className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  rows={3}
                  placeholder={t('Content (English)', 'المحتوى (إنجليزي)', language)}
                  className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <textarea
                  value={annForm.contentAr}
                  onChange={(e) => setAnnForm({ ...annForm, contentAr: e.target.value })}
                  rows={3}
                  placeholder={t('Content (Arabic)', 'المحتوى (عربي)', language)}
                  className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{t('Priority', 'الأولوية', language)}</label>
                  <select
                    value={annForm.priority}
                    onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value as Announcement['priority'] })}
                    className="block rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="normal">{t('Normal', 'عادية', language)}</option>
                    <option value="high">{t('High', 'عالية', language)}</option>
                    <option value="urgent">{t('Urgent', 'عاجلة', language)}</option>
                  </select>
                </div>
                <button
                  onClick={handleCreateAnnouncement}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  <Megaphone className="h-4 w-4" />
                  {t('Publish', 'نشر', language)}
                </button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('Announcements', 'الإعلانات', language)}</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {t('No announcements yet.', 'لا توجد إعلانات بعد.', language)}
                </p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="rounded-xl bg-white shadow-card p-4 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {a.priority === 'urgent' && <Megaphone className="h-4 w-4 text-error" />}
                        <h3 className="font-semibold text-gray-900">
                          {language === 'ar' ? a.titleAr || a.title : a.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[a.priority]}`}>
                          {getPriorityLabel(a.priority, language)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(a.createdAt, language)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' ? a.contentAr || a.content : a.content}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('By', 'بواسطة', language)} {a.author}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title={t('Delete message?', 'حذف الرسالة؟', language)}
        message={t('This message will be removed from the channel.', 'سيتم حذف هذه الرسالة من القناة.', language)}
        confirmLabel={t('Delete', 'حذف', language)}
        onConfirm={() => confirmTarget && handleDelete(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
