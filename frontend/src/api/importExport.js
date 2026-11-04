import { apiRequest } from './client';

export async function createImportJob(body) {
  return apiRequest('/api/v1/import-jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchImportJob(jobId) {
  return apiRequest(`/api/v1/import-jobs/${jobId}`);
}

export async function createExportJob(body) {
  return apiRequest('/api/v1/export-jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchExportJob(jobId) {
  return apiRequest(`/api/v1/export-jobs/${jobId}`);
}
