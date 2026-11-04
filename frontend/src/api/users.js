import { apiRequest } from './client';
import { mockCurrentUser, mockUserPreferences } from '../mocks/mockData.jsx';

export async function fetchCurrentUser() {
  try {
    return await apiRequest('/api/v1/users/me');
  } catch {
    return mockCurrentUser;
  }
}

export async function updateCurrentUser(body) {
  return apiRequest('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function fetchUserPreferences() {
  try {
    return await apiRequest('/api/v1/users/me/preferences');
  } catch {
    return mockUserPreferences;
  }
}

export async function updateUserPreferences(body) {
  return apiRequest('/api/v1/users/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}
