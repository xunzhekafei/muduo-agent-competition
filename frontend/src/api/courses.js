import { apiRequest } from './client';
import { mockCoursesList } from '../mocks/mockData.jsx';

export async function fetchCourses(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  const qs = query.toString();
  try {
    return await apiRequest(`/api/v1/courses${qs ? `?${qs}` : ''}`);
  } catch {
    return mockCoursesList;
  }
}

export async function fetchCourseDetail(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}`);
}

export async function createCourse(body) {
  return apiRequest('/api/v1/courses', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function updateCourse(courseId, body) {
  return apiRequest(`/api/v1/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function deleteCourse(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}`, { method: 'DELETE' });
}

export async function fetchLearningSpaces(courseId) {
  return apiRequest(`/api/v1/courses/${courseId}/learning-spaces`);
}

export async function createLearningSpace(courseId, body) {
  return apiRequest(`/api/v1/courses/${courseId}/learning-spaces`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function updateLearningSpace(courseId, spaceId, body) {
  return apiRequest(`/api/v1/courses/${courseId}/learning-spaces/${spaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function deleteLearningSpace(courseId, spaceId) {
  return apiRequest(`/api/v1/courses/${courseId}/learning-spaces/${spaceId}`, {
    method: 'DELETE'
  });
}
