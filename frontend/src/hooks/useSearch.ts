/** React Query hooks for search. */

import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.searchNotes({ q }),
    enabled: q.length > 0,
  });
}

export function useSuggest(q: string) {
  return useQuery({
    queryKey: ['suggest', q],
    queryFn: () => api.suggestNotes(q),
    enabled: q.length > 0,
  });
}
