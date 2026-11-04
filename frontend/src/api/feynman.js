import { apiRequest } from './client';
import { mockFeynmanSessionResponse } from '../mocks/mockData.jsx';

export async function createFeynmanSession(body) {
  try {
    return await apiRequest('/api/v1/feynman/sessions', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch {
    return mockFeynmanSessionResponse;
  }
}

export async function fetchFeynmanSession(sessionId) {
  try {
    return await apiRequest(`/api/v1/feynman/sessions/${sessionId}`);
  } catch {
    return mockFeynmanSessionResponse;
  }
}

export async function addFeynmanQuestion(sessionId, body) {
  return apiRequest(`/api/v1/feynman/sessions/${sessionId}/questions`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function submitFeynmanEvaluation(sessionId, body) {
  return apiRequest(`/api/v1/feynman/sessions/${sessionId}/evaluation`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function feynmanChat(body) {
  return apiRequest('/api/v1/feynman/chat', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}
