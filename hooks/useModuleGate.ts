'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useModuleStore } from '@/stores/module-store';
import { MODULE_ROUTE_MAP } from '@/lib/module-route-map';

export function useModuleGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { moduleStates, isLoading } = useModuleStore();

  useEffect(() => {
    if (isLoading || !pathname) return;

    const matched = Object.entries(MODULE_ROUTE_MAP).find(
      ([route]) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (!matched) return;

    const [, moduleId] = matched;
    const enabled = moduleStates[moduleId];

    if (!enabled) {
      router.replace('/');
    }
  }, [pathname, moduleStates, isLoading, router]);
}
