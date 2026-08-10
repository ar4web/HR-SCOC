'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { communicationService } from '@/modules/communication/service';
import { Channel } from '@/types';
import { t } from '@/lib/utils';
import { MessageSquare, X, Hash, MessagesSquare, ArrowUpRight, Plus } from 'lucide-react';
export function FloatingChat() {
  const { language, dir } = useLanguageStore();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = React.useState(false);

  const isChatPage = pathname.startsWith('/communication');

  React.useEffect(() => {
    if (!open || isChatPage) return;
    let active = true;
    setLoadingChannels(true);
    communicationService
      .getChannels()
      .then((res) => {
        if (active && res.success && res.data) setChannels(res.data.data);
      })
      .catch(() => {})
      .finally(() => active && setLoadingChannels(false));
    return () => {
      active = false;
    };
  }, [open, isChatPage]);

  React.useEffect(() => {
    if (isChatPage) setOpen(false);
  }, [isChatPage]);

  if (open) {
    return (
      <div className={`fixed bottom-6 z-50 flex w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${language === 'ar' ? 'left-6' : 'right-6'}`} dir={dir}>
        {/* Header */}
        <div className="flex items-center gap-3 bg-primary px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{t('Team Chat', 'دردشة الفريق', language)}</p>
            <p className="text-xs text-white/70 truncate">
              {channels.length} {t('channels', 'قناة', language)}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label={t('Close chat', 'إغلاق الدردشة', language)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-72 overflow-y-auto p-2">
          {loadingChannels ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              {t('No channels', 'لا توجد قنوات', language)}
            </p>
          ) : (
            <div className="space-y-0.5">
              {channels.map((ch) => (
                <Link
                  key={ch.id}
                  href="/communication"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Hash className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{ch.name}</p>
                    {ch.description && <p className="truncate text-xs text-gray-400">{ch.description}</p>}
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-gray-100 p-3">
          <Link
            href="/communication"
            onClick={() => setOpen(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            <MessagesSquare className="h-4 w-4" />
            {t('Open chat', 'فتح الدردشة', language)}
          </Link>
          <Link
            href="/communication?new=1"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
            aria-label={t('New message', 'رسالة جديدة', language)}
            title={t('New message', 'رسالة جديدة', language)}
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isChatPage) return null;

  return (
    <button
      onClick={() => setOpen(true)}
      className={`group fixed bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 ${language === 'ar' ? 'left-6' : 'right-6'}`}
      aria-label={t('Open chat', 'فتح الدردشة', language)}
    >
      <MessageSquare className="h-6 w-6 transition-transform group-hover:-rotate-6" />
      <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-primary/30" />
    </button>
  );
}
