import { apiRequest } from './client';
import { mockNotesList, mockNoteDetail } from '../mocks/mockData.jsx';

export async function fetchNotes(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  if (params.tag) query.set('tag', params.tag);
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  try {
    return await apiRequest(`/api/v1/notes${qs ? `?${qs}` : ''}`);
  } catch {
    return mockNotesList;
  }
}

export async function fetchNoteDetail(noteId) {
  try {
    return await apiRequest(`/api/v1/notes/${noteId}`);
  } catch {
    return mockNoteDetail;
  }
}

export async function createNote(body) {
  return apiRequest('/api/v1/notes', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function updateNote(noteId, body) {
  return apiRequest(`/api/v1/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function deleteNote(noteId) {
  return apiRequest(`/api/v1/notes/${noteId}`, { method: 'DELETE' });
}

export async function addNoteBlock(noteId, body) {
  return apiRequest(`/api/v1/notes/${noteId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function addNoteRelation(noteId, body) {
  return apiRequest(`/api/v1/notes/${noteId}/relations`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function updateNoteBlock(noteId, blockId, body) {
  return apiRequest(`/api/v1/notes/${noteId}/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function deleteNoteBlock(noteId, blockId) {
  return apiRequest(`/api/v1/notes/${noteId}/blocks/${blockId}`, { method: 'DELETE' });
}

export async function saveNoteBlocks(noteId, blocks) {
  return apiRequest(`/api/v1/notes/${noteId}/blocks`, {
    method: 'PUT',
    body: JSON.stringify({ blocks })
  });
}


export async function aiGenerate(prompt) {
  return apiRequest('/api/v1/notes/ai-generate', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
}