import { apiRequest } from './client';
import { mockThinkingSessionResponse } from '../mocks/mockData.jsx';

export async function createThinkingSession(body) {
  try {
    return await apiRequest('/api/v1/thinking/sessions', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch {
    return mockThinkingSessionResponse;
  }
}

export async function fetchThinkingSession(sessionId) {
  try {
    return await apiRequest(`/api/v1/thinking/sessions/${sessionId}`);
  } catch {
    return mockThinkingSessionResponse;
  }
}

export async function addThinkingPrompt(sessionId, body) {
  return apiRequest(`/api/v1/thinking/sessions/${sessionId}/prompts`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function addRevisionSuggestion(sessionId, body) {
  return apiRequest(`/api/v1/thinking/sessions/${sessionId}/suggestions`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function completeThinkingSession(sessionId) {
  return apiRequest(`/api/v1/thinking/sessions/${sessionId}/complete`, {
    method: 'POST'
  });
}
