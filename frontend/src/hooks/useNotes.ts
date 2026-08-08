/** React Query hooks for notes. */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { NoteCreate, NoteUpdate } from '../lib/types';

export function useNoteList(params: {
  page?: number;
  page_size?: number;
  tag_id?: string;
} = {}) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => api.fetchNotes(params),
  });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.fetchNote(id!),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NoteCreate) => api.createNote(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: NoteUpdate }) =>
      api.updateNote(id, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['notes', variables.id] });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
