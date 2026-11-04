import { apiRequest } from './client';

export async function fetchSharedAssets(params = {}) {
  const query = new URLSearchParams();
  if (params.tag) query.set('tag', params.tag);
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  const qs = query.toString();
  return apiRequest(`/api/v1/community/assets${qs ? `?${qs}` : ''}`);
}

export async function createSharedAsset(body) {
  return apiRequest('/api/v1/community/assets', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function collectAsset(assetId, body) {
  return apiRequest(`/api/v1/community/assets/${assetId}/collections`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

export async function createCommunityPost(assetId, body) {
  return apiRequest(`/api/v1/community/assets/${assetId}/posts`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function addInteraction(body) {
  return apiRequest('/api/v1/community/interactions', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function fetchContributions(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  const qs = query.toString();
  return apiRequest(`/api/v1/community/contributions${qs ? `?${qs}` : ''}`);
}
