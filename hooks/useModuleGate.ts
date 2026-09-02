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

    // Only redirect when the module is EXPLICITLY disabled. An unknown/missing
    // state (e.g. newer modules absent from a stale default map, or a failed
    // modules fetch) must not bounce the user off the page.
    if (moduleStates[moduleId] === false) {
      router.replace('/');
    }
  }, [pathname, moduleStates, isLoading, router]);
}
