import { apiRequest, ensureAuth, getAuthToken, setAuthToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 带 Token 过期重试的 fetch 封装
 * 上传请求不能设置 Content-Type（浏览器需自动生成 multipart boundary）
 */
async function fetchWithAuthRetry(url, options, retry = true) {
  await ensureAuth();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getAuthToken()}`,
  };

  const resp = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  const contentType = resp.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await resp.json() : null;

  // Token 过期 → 清除旧 Token，重新登录，重试一次
  if (!resp.ok && resp.status === 401 && retry) {
    const err = payload?.error;
    if (err?.code === 'TOKEN_EXPIRED' || err?.code === 'UNAUTHORIZED') {
      console.log('Token 过期，重新登录后重试上传...');
      setAuthToken(null);
      const newToken = await ensureAuth();
      if (newToken) {
        return fetchWithAuthRetry(url, options, false);
      }
    }
  }

  if (!resp.ok) {
    const err = payload?.error;
    throw new Error(err?.message || '请求失败');
  }
  return payload;
}

/**
 * 上传单个文件到后端（multipart/form-data）
 * @param {File} file - 浏览器 File 对象
 * @returns {Promise<object>} - { fileId, filename, fileType, sizeBytes }
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const payload = await fetchWithAuthRetry('/api/v1/resource-notes/upload', {
    method: 'POST',
    body: formData,
  });
  // payload.data.files[0] → { fileId, filename, fileType, sizeBytes }
  return payload.data.files[0];
}

/**
 * 上传网页链接到后端
 * @param {string} url - 网页链接
 * @returns {Promise<object>} - { fileId, filename, fileType, sizeBytes }
 */
export async function uploadUrl(url) {
  const formData = new FormData();
  formData.append('url', url);

  const payload = await fetchWithAuthRetry('/api/v1/resource-notes/upload', {
    method: 'POST',
    body: formData,
  });
  return payload.data.files[0];
}

/**
 * 提交解析任务
 * @param {string[]} fileIds - 后端返回的 fileId 列表
 * @returns {Promise<object>} - { taskId, status, message }
 */
export async function startParse(fileIds) {
  return apiRequest('/api/v1/resource-notes/parse', {
    method: 'POST',
    body: JSON.stringify({ fileIds }),
  });
}

/**
 * 轮询解析进度
 * @param {string} taskId
 * @returns {Promise<object>} - { taskId, status, progress, phase, result, error }
 */
export async function getParseProgress(taskId) {
  const payload = await apiRequest(`/api/v1/resource-notes/progress/${taskId}`);
  return payload.data;
}

/**
 * 删除已上传的文件
 * @param {string} fileId - 后端返回的 fileId
 * @returns {Promise<object>} - { deleted: true, fileId }
 */
export async function deleteFile(fileId) {
  return apiRequest(`/api/v1/resource-notes/files/${fileId}`, {
    method: 'DELETE',
  });
}

// 保留原有工作流接口
export async function createResourceImport(body) {
  return apiRequest('/api/v1/workflows/resource-notes/import', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchResourceNoteContext(params = {}) {
  const query = new URLSearchParams();
  if (params.courseId) query.set('courseId', params.courseId);
  if (params.resourceId) query.set('resourceId', params.resourceId);
  const qs = query.toString();
  return apiRequest(`/api/v1/workflows/resource-notes/context${qs ? `?${qs}` : ''}`);
}

export async function completeResourceParse(taskId, body) {
  return apiRequest(`/api/v1/workflows/resource-notes/parse-tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
