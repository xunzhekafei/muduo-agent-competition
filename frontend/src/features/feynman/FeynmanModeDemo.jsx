import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePicker } from '../../shared/components';
import { Button, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

// ── 五轮对话数据（线程与进程）──
const DEMO_TOPIC = '线程与进程的区别';

const AI_INITIAL = `同学你好！今天换你来当老师，给我讲讲「线程与进程的区别」吧。我先问个贴近生活的问题——你平时用电脑有没有遇到过程序"未响应"的情况？你觉得那时候是进程卡住了还是线程卡住了？`;

const ROUNDS = [
  {
    userInput: `程序未响应一般是主线程被阻塞了——比如在主线程里读写大文件或者写了个死循环，界面就卡住了。但进程本身还在，后台线程也还在跑。关键区别是：进程是资源分配的单位，有独立的虚拟地址空间和文件描述符表。线程是CPU调度的单位，同进程的线程共享堆内存和全局变量，但各自有独立的栈和寄存器。`,
    aiReply: `说得不错！你提到进程有独立内存、线程共享内存，这个区分很关键。那我拿生活打个比方——进程像一个独立的房子，线程像住在里面的家人，共享客厅厨房。如果两个家人同时要上厕所，那是不是就冲突了？这个"抢资源"的问题在计算机里怎么解决？`,
  },
  {
    userInput: `对啊，这就是竞态条件。解决办法是互斥锁——就像厕所门上的锁，谁拿到锁谁进去，其他人排队等。代码里用 mutex 保护临界区，保证同一时刻只有一个线程访问共享数据。但锁也有坑——用得不好会死锁。比如线程A拿了锁1等锁2，线程B拿了锁2等锁1，两边互相等永远解不开。`,
    aiReply: `嗯，互斥锁这个例子很形象。那我顺着往下问——锁用不好会不会出别的问题？你听说过"死锁"吗？能举个生活中的死锁例子吗？`,
  },
  {
    userInput: `死锁就像两个人在窄巷子里迎面碰上了，谁也不肯退，就都卡住了。计算机里也是——两个线程各自占着一个资源等对方的资源。避免死锁有几个方法：按固定顺序加锁、加超时机制、或者 trylock 失败了就释放已持有的锁重来。哲学家进餐问题就是经典的死锁例子——五个哲学家围坐，每个人要先拿左边叉子再拿右边叉子，如果同时都拿了左边的，就全卡住了。`,
    aiReply: `讲得好。你刚才一直在说线程，那我们换个角度——既然线程之间通信这么方便，为什么还需要多个进程呢？进程之间又要怎么通信？`,
  },
  {
    userInput: `因为隔离本身就是优势。一个进程崩了不影响别的——比如Chrome每个标签页是独立进程，某个页面卡死不会拖垮整个浏览器。另外不同进程可以不同权限跑，安全性更好。进程间通信靠IPC——管道最简单但只能单向；消息队列支持异步；共享内存速度最快但要配信号量做同步；Socket能跨网络。选哪个看场景——大数据高频用共享内存，简单流水线用管道。`,
    aiReply: `不错，IPC 和隔离性都提到了。最后一个问题——Chrome 浏览器每个标签页都是独立进程，你知道为什么它要这样设计吗？如果你来设计一个浏览器，你会用多进程还是多线程？`,
  },
  {
    userInput: `我一定用多进程。原因很简单——不能让一个页面的问题影响其他页面。以前IE一个标签页卡死整个浏览器就没了。Chrome的做法是每个标签页一个渲染进程跑在沙箱里，互不干扰。安全上也是——淘宝页面看不到银行页面的数据，天然隔离。代价是吃内存，但用户体验更重要。Chrome还会在内存紧张时自动休眠后台标签页来省资源。`,
    aiReply: null,
    evaluation: {
      summary: '讲得很清楚！你对进程隔离、线程共享、同步机制的理解都到位，Chrome 的例子也很贴切。',
      scores: [
        { label:'逻辑', value:87 },
        { label:'准确度', value:90 },
        { label:'清晰度', value:83 },
        { label:'举例', value:92 },
        { label:'应答', value:85 },
      ],
      gaps: ['IPC 各类方式的优劣对比不够具体', '死锁的四个必要条件没展开讲'],
      tips: ['对比一下管道、共享内存、消息队列的性能差异', '用哲学家进餐问题来理解死锁会更直观'],
    },
  },
];

const SCORE_COLORS = ['#E9E2F7', '#E2EBF7', '#D7EFE4', '#DDF0EA', '#10A37F'];

// ── 组件 ──
const FeynmanModeDemo = () => {
  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutFeynman = () => {
    askAI('我在用费曼学习法讲解一个知识点，帮我检验我的理解是否完整、哪里有逻辑漏洞');
    navigate('/agent');
  };

  const [showPicker, setShowPicker] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [phase, setPhase] = useState('briefing'); // briefing | chat | done
  const [messages, setMessages] = useState([]);
  const [round, setRound] = useState(0);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingRound, setRecordingRound] = useState(0);
  const chatRef = useRef(null);
  const typeTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const sessionRef = useRef(0);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, typing]);

  // textarea 自适应高度
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const isSessionDone = evaluation != null;

  // ── 逐字输出 AI 回复（模拟 streaming）──
  const streamAiReply = useCallback((fullText, sid, onDone) => {
    setMessages(prev => [...prev, { role:'ai', text: '' }]);
    let idx = 0;
    const speed = 28 + Math.random() * 16;
    const tick = () => {
      if (sid !== sessionRef.current) return;
      if (idx < fullText.length) {
        idx++;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role:'ai', text: fullText.slice(0, idx) };
          return copy;
        });
        typeTimerRef.current = setTimeout(tick, speed);
      } else {
        setTyping(false);
        if (onDone) onDone();
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    };
    typeTimerRef.current = setTimeout(tick, 20);
  }, []);

  // ── 开始讲解 ──
  const handleStart = () => {
    ++sessionRef.current;
    setPhase('chat');
    setMessages([]);
    setRound(0);
    setEvaluation(null);
    setTyping(true);
    // 思考 2 秒后逐字输出 AI 开场
    typeTimerRef.current = setTimeout(() => streamAiReply(AI_INITIAL, sessionRef.current), 2000);
  };

  // ── 发送消息 ──
  const handleSend = () => {
    if (!input.trim() || typing || isSessionDone) return;
    const text = input.trim();
    const sid = ++sessionRef.current;
    setMessages(prev => [...prev, { role:'user', text }]);
    setInput('');
    setTyping(true);

    const currentRound = ROUNDS[round];
    // 思考 3-5 秒后逐字回复
    const thinkTime = 3000 + Math.random() * 2000;
    typeTimerRef.current = setTimeout(() => {
      if (sid !== sessionRef.current) return;
      if (currentRound.evaluation) {
        streamAiReply('聊了这么多，我来帮你总结一下——', sid, () => {
          if (sid === sessionRef.current) {
            setEvaluation(currentRound.evaluation);
            setPhase('done');
          }
        });
      } else if (currentRound.aiReply) {
        streamAiReply(currentRound.aiReply, sid);
        setRound(r => r + 1);
      }
    }, thinkTime);
  };

  // ── 录音模拟 ──
  const handleRecord = useCallback(() => {
    if (typing || isSessionDone) return;
    const r = ROUNDS[round];
    if (!r || !r.userInput) return;

    setIsRecording(true);
    setRecordingRound(round);
    setInput('');

    const fullText = r.userInput;
    let idx = 0;
    // 0.5x 语速：60-90ms/字，模拟正常人说话
    const speed = 60 + Math.random() * 30;

    const tick = () => {
      if (idx < fullText.length) {
        idx++;
        setInput(fullText.slice(0, idx));
        typeTimerRef.current = setTimeout(tick, speed);
      } else {
        setIsRecording(false);
      }
    };
    typeTimerRef.current = setTimeout(tick, 300); // 300ms 初始延迟
  }, [round, typing, isSessionDone]);

  // 清理
  useEffect(() => () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); }, []);

  // ── 返回简报 ──
  const handleReset = () => {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    setPhase('briefing');
    setMessages([]);
    setInput('');
    setRound(0);
    setEvaluation(null);
    setIsRecording(false);
    setTyping(false);
  };

  // ── 再来一次 ──
  const handleTryAgain = () => {
    setPhase('briefing');
    setMessages([]);
    setInput('');
    setRound(0);
    setEvaluation(null);
    setIsRecording(false);
    setTyping(false);
    setTimeout(() => handleStart(), 300);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 140px)', color: '#1F1F1F' }}>
      {showPicker && (
        <FilePicker
          title="选择讲解文件"
          onSelect={(f) => { setSelectedFile(f); setShowPicker(false); }}
          onCancel={() => setShowPicker(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-sm border border-[#f3f4f6] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div className="flex items-center gap-3">
            {phase !== 'briefing' && (
              <button
                type="button"
                onClick={handleReset}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f0f1f3] hover:bg-[#e3e5e8] transition-colors flex-shrink-0"
              >
                <svg className="h-5 w-5 text-[#5a5f66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#1F1F1F]">费曼模式</h1>
              <p className="text-xs text-[#7B7B7B] font-medium">能讲清楚，才算真正掌握</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={askAboutFeynman}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f1f3] text-sm font-medium text-[#5a5f66] hover:bg-[#e3e5e8] transition-colors"
            >
              <svg width="20" height="16" viewBox="0 0 36 30" fill="none" className="flex-shrink-0"><path d="M2 7a2.5 2.5 0 012.5-2.5h8.5l3 2h13.5a2.5 2.5 0 012.5 2.5V24a2.5 2.5 0 01-2.5 2.5H4.5A2.5 2.5 0 012 24V7z" fill="#F7ECD9" stroke="#E5D9B0" strokeWidth="1.5"/><path d="M2 9v15a2.5 2.5 0 002.5 2.5h24a2.5 2.5 0 002.5-2.5V9H2z" fill="#FFFDF5" stroke="#E5D9B0" strokeWidth="1.5"/></svg>
              {selectedFile ? `${selectedFile.course || ''} / ${selectedFile.name || ''}` : '选择讲解文件...'}
            </button>
          </div>
        </div>

        {/* ===== 简报卡 ===== */}
        {phase === 'briefing' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-8 max-w-lg w-full text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[#E9E2F7]">
                <svg className="h-7 w-7 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-3">本次讲解任务</h2>
              {selectedFile && <p className="text-xs text-[#9ca3af] mb-4">{selectedFile.course} / {selectedFile.name}</p>}
              <div className="p-5 rounded-2xl bg-[#FAFAFA] text-left mb-5">
                <p className="text-sm font-semibold text-[#1F1F1F] mb-3">请你当老师，AI来当学生——讲解《{DEMO_TOPIC}》</p>
                <div className="space-y-2">
                  {[
                    '用简单的语言讲清楚核心概念，避免用术语堆砌',
                    '找出你理解中最模糊的点，尝试把它讲透',
                    '举一个生活或工作中的具体例子来验证理解',
                  ].map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-lg bg-[#E9E2F7]/50 flex items-center justify-center text-[10px] font-bold text-[#5B3FA8] flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-[#6b7280] leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-[#F7ECD9]/50 text-xs text-[#8A5A1A]">💡 从资源分配和调度执行两个维度来区分</div>
              </div>
              <button type="button" onClick={handleStart} className="px-8 py-3 rounded-xl bg-[#10A37F] text-[#1F1F1F] font-semibold hover:bg-[#0D8B6C] transition-colors">
                开始讲解
              </button>
            </div>
          </div>
        )}

        {/* ===== 聊天区 ===== */}
        {(phase === 'chat' || phase === 'done') && (
          <>
            {/* 轮次提示 */}
            {!isSessionDone && (
              <div className="px-5 py-2 bg-[#F7ECD9]/40 border-b border-[#F7ECD9] flex-shrink-0">
                <p className="text-xs text-[#8A5A1A] text-center">
                  第 {round + 1} / 5 轮 · 还有 {5 - round} 次讲解机会
                </p>
              </div>
            )}
            {isSessionDone && (
              <div className="px-5 py-2 bg-[#E9E2F7]/30 border-b border-[#E9E2F7]/40 flex-shrink-0">
                <p className="text-xs text-[#5B3FA8] text-center font-medium">五轮讲解完成</p>
              </div>
            )}

            <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 p-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-3 max-w-[78%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* 头像 */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-[#10A37F]/25' : 'bg-[#E9E2F7]/40'}`}>
                      {m.role === 'user' ? (
                        <svg className="h-5 w-5 text-[#5C7A10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
                        </svg>
                      )}
                    </div>
                    {/* 气泡 */}
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#10A37F]/15 text-[#1F1F1F] border border-[#10A37F]/25' : 'bg-[#f3f4f6] text-[#374151]'}`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}

              {/* 思考中... */}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#f3f4f6]">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 评估报告 */}
              {evaluation && (
                <div className="p-5 rounded-2xl bg-white border border-[#f3f4f6] shadow-sm">
                  <h3 className="font-bold text-center mb-3 text-sm">评估报告</h3>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {evaluation.scores.map(s => (
                      <div key={s.label} className="p-2 rounded-xl text-center" style={{ backgroundColor: SCORE_COLORS[evaluation.scores.indexOf(s) % SCORE_COLORS.length] }}>
                        <p className="text-[9px] text-[#5a5f66]">{s.label}</p>
                        <p className="text-lg font-bold text-[#1F1F1F]">{s.value}%</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-[#c0392b] mb-1">漏洞</p>
                      {evaluation.gaps.map((g, i) => <p key={i} className="text-[#7B7B7B]">• {g}</p>)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A7A57] mb-1">建议</p>
                      {evaluation.tips.map((t, i) => <p key={i} className="text-[#7B7B7B]">• {t}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex-shrink-0 border-t border-[#f3f4f6] p-4">
              {isSessionDone ? (
                /* 结束：再来一次 / 返回简报 */
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    className="px-6 py-2.5 rounded-xl bg-[#10A37F] text-[#1F1F1F] text-sm font-semibold hover:bg-[#0D8B6C] transition-colors"
                  >
                    再来一次
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-xl bg-[#f0f1f3] text-[#5a5f66] text-sm font-medium hover:bg-[#e3e5e8] transition-colors"
                  >
                    返回简报
                  </button>
                </div>
              ) : (
                /* 对话中：录音 + 输入 + 发送 */
                <div className="flex items-center gap-3">
                  {/* 录音按钮 */}
                  <button
                    type="button"
                    onClick={handleRecord}
                    disabled={typing || isRecording}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isRecording
                        ? 'bg-[#DC2626] text-white shadow-[0_0_0_4px_rgba(220,38,38,0.2)]'
                        : 'bg-[#f5f5f5] text-[#7B7B7B] hover:bg-[#e8e8e8]'
                    }`}
                    title="点击录音"
                  >
                    {isRecording ? (
                      /* 录音中：声波动画 */
                      <span className="flex items-end gap-0.5 h-4">
                        <span className="w-1 h-3 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite]"/>
                        <span className="w-1 h-4 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_0.15s_infinite]"/>
                        <span className="w-1 h-2.5 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_0.3s_infinite]"/>
                      </span>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/>
                      </svg>
                    )}
                  </button>

                  {/* 录音状态文字 */}
                  {isRecording && (
                    <span className="text-xs text-[#DC2626] font-medium animate-pulse flex-shrink-0">正在聆听...</span>
                  )}

                  {/* 自适应文本框 */}
                  <textarea
                    ref={textareaRef}
                    className="flex-1 bg-transparent text-sm placeholder:text-[#A0A0A0] focus:outline-none py-2 resize-none"
                    placeholder={isRecording ? '' : '输入你的讲解，或点击左侧麦克风录音...'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && !typing && !isRecording) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={typing || isRecording}
                    readOnly={isRecording}
                    rows={1}
                  />

                  {/* 发送按钮 */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || typing || isRecording}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeynmanModeDemo;
