import { apiRequest } from './client';
import { mockQuickNotesHistory, mockRegularNoteContent } from '../mocks/mockData.jsx';

// ── 速记历史列表 ──

export async function fetchQuickNotesList() {
  try {
    return await apiRequest('/api/v1/quick-notes');
  } catch {
    return mockQuickNotesHistory;
  }
}

// ── 单条速记详情 ──

export async function fetchQuickNote(noteId) {
  try {
    return await apiRequest(`/api/v1/quick-notes/${noteId}`);
  } catch {
    return mockRegularNoteContent;
  }
}

// ── 创建速记 ──

export async function createQuickNote(body) {
  try {
    return await apiRequest('/api/v1/quick-notes', {
      method: 'POST', body: JSON.stringify(body),
    });
  } catch {
    const { createNote } = await import('./notes');
    return createNote(body);
  }
}

// ── 保存速记内容 ──

export async function updateQuickNote(noteId, body) {
  return apiRequest(`/api/v1/quick-notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ── 追加时间流条目 ──

export async function addTimelineItem(noteId, body) {
  return apiRequest(`/api/v1/quick-notes/${noteId}/timeline`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
