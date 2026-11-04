import { apiRequest } from './client';

// ── 记忆库 ──

export async function fetchMemoryLibrary() {
  return apiRequest('/api/v1/memory/library');
}

// ── 记忆卡片 CRUD ──

export async function fetchMemoryCards(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  if (params.sourceNoteId) query.set('sourceNoteId', params.sourceNoteId);
  const qs = query.toString();
  return apiRequest(`/api/v1/memory/cards${qs ? `?${qs}` : ''}`);
}

export async function createMemoryCard(body) {
  return apiRequest('/api/v1/memory/cards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateMemoryCard(cardId, body) {
  return apiRequest(`/api/v1/memory/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteMemoryCard(cardId) {
  return apiRequest(`/api/v1/memory/cards/${cardId}`, { method: 'DELETE' });
}

// ── 卡片生成 ──

export async function generateMemoryCards(noteId, body = {}) {
  return apiRequest(`/api/v1/memory/notes/${noteId}/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function pollAiTask(taskId, interval = 1000, maxRetries = 60) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await apiRequest(`/api/v1/ai-tasks/${taskId}`);
    const status = res?.data?.status;
    if (status === 'succeeded') return res.data;
    if (status === 'failed') throw new Error(res.data?.errorMessage || 'AI 任务失败');
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('AI 任务超时');
}

// ── 记忆周期 ──

export async function selectMemoryCycle(noteId, cycle) {
  return apiRequest(`/api/v1/memory/notes/${noteId}/cycle`, {
    method: 'PUT',
    body: JSON.stringify({ cycle }),
  });
}

// ── 复习记录 ──

export async function recordCardReview(cardId, body) {
  return apiRequest(`/api/v1/memory/cards/${cardId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function completeNoteReview(noteId) {
  return apiRequest(`/api/v1/memory/notes/${noteId}/complete-review`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
