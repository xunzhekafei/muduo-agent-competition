import { apiRequest } from './client';

export async function createAiTask(body) {
  return apiRequest('/api/v1/ai-tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchAiTask(taskId) {
  return apiRequest(`/api/v1/ai-tasks/${taskId}`);
}

export async function updateAiTask(taskId, body) {
  return apiRequest(`/api/v1/ai-tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function cancelAiTask(taskId) {
  return apiRequest(`/api/v1/ai-tasks/${taskId}/cancel`, {
    method: 'POST',
  });
}
