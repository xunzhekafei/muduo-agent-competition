import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * 对话会话状态（前端本地持久化，无后端）。
 * 让「新对话 / 历史列表 / 切换对话」在刷新后仍然存在，
 * 侧边栏与聊天区通过这里共享同一份数据。
 */
const STORAGE_KEY = 'muduo_agent_state_v1';

const AgentContext = createContext(null);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
          activeId: parsed.activeId ?? null,
          messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
          pendingPrompt: parsed.pendingPrompt ?? null,
        };
      }
    }
  } catch {
    // 忽略损坏的本地数据
  }
  return { conversations: [], activeId: null, messages: {}, pendingPrompt: null };
}

function createId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function AgentProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储满/隐私模式时静默失败
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      newChat() {
        const id = createId();
        const convo = { id, title: '新对话', createdAt: Date.now(), updatedAt: Date.now() };
        setState((s) => ({
          conversations: [convo, ...s.conversations],
          activeId: id,
          messages: { ...s.messages, [id]: [] },
        }));
        return id;
      },

      selectChat(id) {
        setState((s) => (s.activeId === id ? s : { ...s, activeId: id }));
      },

      deleteChat(id) {
        setState((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const messages = { ...s.messages };
          delete messages[id];
          const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId, messages };
        });
      },

      setMessages(id, messages) {
        setState((s) => ({ ...s, messages: { ...s.messages, [id]: messages } }));
      },

      // 更新标题 / 刷新排序时间
      touchChat(id, { title } = {}) {
        setState((s) => ({
          ...s,
          conversations: s.conversations.map((c) =>
            c.id === id
              ? { ...c, updatedAt: Date.now(), ...(title !== undefined ? { title } : {}) }
              : c,
          ),
        }));
      },

      // 从工具「问 AI」：新建会话并把问题挂起，聊天页挂载后自动发送
      askAI(prompt) {
        const id = createId();
        const convo = {
          id,
          title: prompt.slice(0, 24),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setState((s) => ({
          conversations: [convo, ...s.conversations],
          activeId: id,
          messages: { ...s.messages, [id]: [] },
          pendingPrompt: prompt,
        }));
      },

      clearPending() {
        setState((s) => ({ ...s, pendingPrompt: null }));
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({
      conversations: state.conversations,
      activeId: state.activeId,
      messages: state.messages,
      pendingPrompt: state.pendingPrompt,
      ...actions,
    }),
    [state, actions],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent 必须在 AgentProvider 内使用');
  return ctx;
}
