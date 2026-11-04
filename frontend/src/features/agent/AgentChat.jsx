import React, { useEffect, useRef, useState } from 'react';
import { agentChatStream, fetchAgentConfig, fetchCapabilities } from '../../api/agent';
import { useAgent } from './AgentContext';
import ToolTrace, { TOOL_LABELS } from './ToolTrace';

const SUGGESTIONS = [
  '我下周要考操作系统，帮我制定复习计划',
  '帮我找一下关于进程调度的笔记',
  '我学得怎么样？哪里比较薄弱',
];

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
        style={{ animationDelay: `${i * 0.12}s` }}
      />
    ))}
  </div>
);

const AgentChat = () => {
  const {
    conversations,
    activeId,
    messages: allMessages,
    newChat,
    setMessages,
    touchChat,
    pendingPrompt,
    clearPending,
  } = useAgent();

  const messages = (activeId && allMessages[activeId]) || [];
  const activeConvo = conversations.find((c) => c.id === activeId);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [caps, setCaps] = useState(null);
  const [liveTrace, setLiveTrace] = useState([]);
  const listRef = useRef(null);
  const taRef = useRef(null);
  const ensuredRef = useRef(false);

  // 首次进入时若还没有会话，自动创建一个（仅一次，避免 StrictMode 重复）
  useEffect(() => {
    if (ensuredRef.current) return;
    ensuredRef.current = true;
    if (conversations.length === 0) {
      newChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAgentConfig().then(setConfig).catch(() => {});
    fetchCapabilities().then(setCaps).catch(() => {});
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading || !activeId) return;

    const next = [...messages, { role: 'user', content }];
    setMessages(activeId, next);
    // 用第一句用户输入作为对话标题
    if (activeConvo && activeConvo.title === '新对话') {
      touchChat(activeId, { title: content.slice(0, 24) });
    }
    setInput('');
    setError('');
    setLoading(true);
    setLiveTrace([]);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      await agentChatStream(
        next.map((m) => ({ role: m.role, content: m.content })),
        {
          onStep: (entry) => setLiveTrace((prev) => [...prev, entry]),
          onDone: (data) => {
            setMessages(activeId, [
              ...next,
              {
                role: 'assistant',
                content: data.reply,
                trace: data.trace,
                meta: { elapsedMs: data.elapsedMs, steps: data.steps, stopped: data.stopped },
              },
            ]);
          },
          onError: ({ message }) => setError(message ?? '请求失败，请稍后重试'),
        },
      );
    } catch (err) {
      setError(err?.message ?? '请求失败，请稍后重试');
    } finally {
      setLoading(false);
      setLiveTrace([]);
    }
  };

  // 从工具「问 AI」跳转过来时，自动把挂起的问题发出去
  useEffect(() => {
    if (!pendingPrompt) return;
    clearPending();
    send(pendingPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const modelLabel = config ? `${config.model} · ${config.reasoningEffort || '默认'}` : '木铎 · 学习导师';
  const capsHint = caps
    ? caps.embedding?.live
      ? ' · 语义检索已启用'
      : ' · 演示模式'
    : '';

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white">
      {/* 消息区 */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 pb-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center pt-[16vh] pb-12">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: '#10A37F' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-[#1F1F1F] mb-2">今天想学什么？</h2>
              <p className="text-sm text-[#6B7280] mb-8 max-w-sm leading-relaxed">
                我会自己去查笔记、看掌握度、安排复习，然后给你一份能执行的计划
              </p>
              <div className="flex flex-col gap-2.5 w-full max-w-md">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => send(item)}
                    className="text-left text-sm text-[#4b4b4b] px-4 py-3 rounded-xl border border-black/[0.06] hover:border-[#10A37F]/40 hover:bg-[#10A37F]/[0.03] transition-all"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div key={index} className="flex justify-end py-2.5">
                <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed text-[#1F1F1F] whitespace-pre-wrap break-words"
                  style={{ backgroundColor: '#F4F4F4' }}>
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={index} className="py-2.5">
                <p className="text-[11px] font-medium text-[#9CA3AF] mb-1.5">{modelLabel}</p>
                <div className="text-[15px] leading-relaxed text-[#1F1F1F] whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <ToolTrace trace={message.trace} />
                {message.meta && message.meta.steps > 0 && (
                  <p className="mt-2 text-[11px] text-[#B0B0B0]">
                    {message.meta.steps} 步 · {(message.meta.elapsedMs / 1000).toFixed(1)} 秒
                  </p>
                )}
              </div>
            ),
          )}

          {loading && (
            <div className="py-2.5">
              <p className="text-[11px] font-medium text-[#9CA3AF] mb-1.5">{modelLabel}</p>
              <div className="flex items-center gap-2.5">
                <TypingDots />
                <span className="text-xs text-[#9CA3AF]">
                  {liveTrace.length > 0 ? '正在执行工具…' : '正在思考…'}
                </span>
              </div>
              {liveTrace.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {liveTrace.map((s) => (
                    <div key={s.step} className="flex items-center gap-1.5 text-xs">
                      <span className={s.ok ? 'text-[#10A37F]' : 'text-[#d06b6b]'}>
                        {s.ok ? '✓' : '✗'}
                      </span>
                      <span className="font-medium text-[#4a4a4a]">
                        {TOOL_LABELS[s.tool] ?? s.tool}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="py-3">
              <div className="text-xs text-[#c0504d] px-4 py-2.5 rounded-xl"
                style={{ backgroundColor: '#FDF0EF' }}>
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 输入区 */}
      <div className="px-6 pb-5">
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-end gap-3 rounded-3xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm focus-within:border-[#10A37F]/50 transition-colors">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="问点什么，或告诉它你的学习目标…"
              className="flex-1 bg-transparent text-[15px] text-[#1F1F1F] placeholder:text-[#9CA3AF] resize-none outline-none py-1 max-h-40"
              style={{ minHeight: '24px' }}
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-30"
              style={{ backgroundColor: '#10A37F' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#B0B0B0]">
            Enter 发送 · Shift + Enter 换行 · {modelLabel}{capsHint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
