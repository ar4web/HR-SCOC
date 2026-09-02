import React from 'react';
import { create } from 'zustand';

/**
 * Global search — ONE search bar in the header for the whole app.
 *
 * Pages that have searchable content register a "scope" on mount
 * (placeholder text describing what will be searched). While a scope is
 * active, the header input filters that page live via `query`.
 * Pages without a scope fall back to the cross-app navigator dropdown.
 */

export interface SearchScope {
  /** Unique id — usually the route. */
  id: string;
  placeholder: string;
  placeholderAr: string;
}

interface SearchState {
  query: string;
  setQuery: (q: string) => void;
  scope: SearchScope | null;
  registerScope: (scope: SearchScope) => void;
  unregisterScope: (id: string) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  setQuery: (query) => set({ query }),
  scope: null,
  registerScope: (scope) => set({ scope, query: '' }),
  unregisterScope: (id) => {
    if (get().scope?.id === id) set({ scope: null, query: '' });
  },
}));

/**
 * Hook for pages: register this page as the active search scope and
 * receive the live query typed in the header search bar.
 *
 *   const query = usePageSearch('/todos', 'Search tasks…', 'ابحث عن مهام…');
 */
export function usePageSearch(id: string, placeholder: string, placeholderAr: string): string {
  const { query, registerScope, unregisterScope } = useSearchStore();

  React.useEffect(() => {
    registerScope({ id, placeholder, placeholderAr });
    return () => unregisterScope(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, placeholder, placeholderAr]);

  return query;
}
