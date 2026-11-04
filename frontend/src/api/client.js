const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

let _authToken = localStorage.getItem('auth_token') || null;

export function getAuthToken() {
  return _authToken;
}

export function setAuthToken(token) {
  _authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export async function login(email, password) {
  const resp = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await resp.json();
  if (!resp.ok) {
    throw new ApiError(payload?.error?.message ?? '登录失败', {
      status: resp.status,
      code: payload?.error?.code,
    });
  }
  if (payload?.data?.accessToken) {
    _authToken = payload.data.accessToken;
    localStorage.setItem('auth_token', _authToken);
    localStorage.setItem('auth_email', email);
    return payload.data;
  }
  throw new ApiError('登录失败，无法获取令牌');
}

export async function ensureAuth() {
  if (_authToken) return _authToken;
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@muduo.local', password: 'muduo123456' }),
    });
    const payload = await resp.json();
    if (payload?.data?.accessToken) {
      _authToken = payload.data.accessToken;
      localStorage.setItem('auth_token', _authToken);
      return _authToken;
    }
  } catch {
    // fall through
  }
  return null;
}

export function isLoggedIn() {
  return !!_authToken || !!localStorage.getItem('auth_token');
}

export function logout() {
  _authToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_email');
}

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}, retry = true) {
  await ensureAuth();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  // 如果 token 过期，尝试重新登录后重试
  if (!response.ok && response.status === 401 && retry) {
    const error = payload?.error;
    if (error?.code === 'TOKEN_EXPIRED' || error?.code === 'UNAUTHORIZED') {
      console.log('Token 已过期，尝试重新登录...');
      // 清除过期的 token
      _authToken = null;
      localStorage.removeItem('auth_token');
      // 重新登录
      const newToken = await ensureAuth();
      if (newToken) {
        // 重新发起请求
        return apiRequest(path, options, false);
      }
    }
  }

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(error?.message ?? 'Request failed', {
      status: response.status,
      code: error?.code,
      details: error?.details,
    });
  }

  return payload;
}
