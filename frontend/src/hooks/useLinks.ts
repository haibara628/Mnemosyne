/** React Query hooks for links and graph. */

import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

export function useBacklinks(noteId: string | undefined) {
  return useQuery({
    queryKey: ['backlinks', noteId],
    queryFn: () => api.fetchBacklinks(noteId!),
    enabled: !!noteId,
  });
}

export function useOutlinks(noteId: string | undefined) {
  return useQuery({
    queryKey: ['outlinks', noteId],
    queryFn: () => api.fetchOutlinks(noteId!),
    enabled: !!noteId,
  });
}

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => api.fetchGraph(),
  });
}
