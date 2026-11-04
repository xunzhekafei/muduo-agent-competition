import { apiRequest, ensureAuth } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 发起一次 Agent 对话。
 * messages: [{ role: 'user' | 'assistant', content: string }]
 * 返回: { reply, trace, steps, stopped, elapsedMs, usage }
 */
export async function agentChat(messages, options = {}) {
  const payload = await apiRequest('/api/v1/agent/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, ...options }),
  });
  return payload.data;
}

export async function fetchAgentTools() {
  const payload = await apiRequest('/api/v1/agent/tools');
  return payload.data;
}

export async function fetchAgentConfig() {
  const payload = await apiRequest('/api/v1/agent/config');
  return payload.data;
}

/**
 * 获取系统能力状态：哪些 AI 能力是真实 provider、哪些是 mock。
 * 返回: { llm: {provider, live}, embedding: {...}, ocr: {...}, ... }
 */
export async function fetchCapabilities() {
  const payload = await apiRequest('/api/v1/capabilities');
  return payload.data;
}

/**
 * 流式 Agent 对话（SSE）。
 * messages: [{ role, content }]
 * 回调: onStep({step,tool,args,result,ok}) / onDone(result) / onError({message})
 */
export async function agentChatStream(messages, { onStep, onDone, onError, signal } = {}) {
  const token = await ensureAuth();
  const resp = await fetch(`${API_BASE_URL}/api/v1/agent/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    let message = '请求失败';
    try {
      const payload = await resp.json();
      message = payload?.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleChunk = (raw) => {
    const line = raw.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return;
    const text = line.slice(6).trim();
    if (!text) return;
    try {
      const { event, data } = JSON.parse(text);
      if (event === 'step') onStep?.(data);
      else if (event === 'done') onDone?.(data);
      else if (event === 'error') onError?.(data);
    } catch {
      // 忽略无法解析的行
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      handleChunk(raw);
    }
  }
  if (buffer.trim()) handleChunk(buffer);
}
