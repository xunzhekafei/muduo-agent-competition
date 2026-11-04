import React, { useState, useEffect, useRef } from 'react';
import { FilePicker } from '../../shared/components';
import { feynmanChat } from '../../api/feynman';

// ============ 演示模式 ============
const DEMO_MODE = true;

const DEMO_RESPONSES = {
  initial: `同学你好！今天换你来当老师，给我讲讲「线程与进程的区别」吧。我先问个贴近生活的问题——你平时用电脑有没有遇到过程序"未响应"的情况？你觉得那时候是进程卡住了还是线程卡住了？`,
  followups: [
    `说得不错！你提到进程有独立内存、线程共享内存，这个区分很关键。那我拿生活打个比方——进程像一个独立的房子，线程像住在里面的家人，共享客厅厨房。如果两个家人同时要上厕所，那是不是就冲突了？这个"抢资源"的问题在计算机里怎么解决？`,
    `嗯，互斥锁这个例子很形象。那我顺着往下问——锁用不好会不会出别的问题？你听说过"死锁"吗？能举个生活中的死锁例子吗？`,
    `讲得好。你刚才一直在说线程，那我们换个角度——既然线程之间通信这么方便，为什么还需要多个进程呢？进程之间又要怎么通信？`,
    `不错，IPC 和隔离性都提到了。最后一个问题——Chrome 浏览器每个标签页都是独立进程，你知道为什么它要这样设计吗？如果你来设计一个浏览器，你会用多进程还是多线程？`,
  ],
  evaluation: {
    summary: '讲得很清楚！你对进程隔离、线程共享、同步机制的理解都到位，Chrome 的例子也很贴切。可以再深入了解一下不同 IPC 方式的适用场景和性能差异。',
    scores: [ // values filled at runtime
      { label:'逻辑', value:0 },
      { label:'准确度', value:0 },
      { label:'清晰度', value:0 },
      { label:'举例', value:0 },
      { label:'应答', value:0 },
    ],
    gaps: ['IPC 各类方式的优劣对比不够具体', '死锁的四个必要条件没展开讲'],
    tips: ['可以对比一下管道、共享内存、消息队列的性能差异', '用哲学家进餐问题来理解死锁会更直观'],
  },
};

const SCORE_COLORS = ['#E9E2F7', '#E2EBF7', '#D7EFE4', '#DDF0EA', '#10A37F'];

const FEYNMAN_REQUIREMENTS = [
  '用简单的语言讲清楚核心概念，避免用术语堆砌',
  '找出你理解中最模糊的点，尝试把它讲透',
  '举一个生活或工作中的具体例子来验证理解',
];

const TASKS = [
  { topic: '线程与进程的区别', briefing: { goal:'请向AI学生讲解：线程与进程的区别是什么？', hint:'从资源分配和调度执行两个维度来区分' }},
  { topic: '线程同步与互斥', briefing: { goal:'请向AI学生讲解：线程同步与互斥的机制', hint:'想想多线程同时访问共享数据会发生什么' }},
  { topic: '进程间通信方式', briefing: { goal:'请向AI学生讲解：进程间有哪些通信方式？', hint:'管道、消息队列、共享内存、信号量各自适用什么场景' }},
];

function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/#{1,6}\s/g, '');
}

// ============ 简报卡 ============
function BriefingCard({ fileName, currentTask, onStart }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="p-8 max-w-lg w-full text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[#E9E2F7]">
          <svg className="h-7 w-7 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-3">本次讲解任务</h2>
        <div className="p-5 rounded-2xl bg-[#FAFAFA] text-left mb-5">
          <p className="text-sm font-semibold text-[#1F1F1F] mb-3">请你当老师，AI来当学生——讲解《{fileName}》</p>
          <div className="space-y-2">
            {FEYNMAN_REQUIREMENTS.map((r,i)=>(
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#E9E2F7]/50 flex items-center justify-center text-[10px] font-bold text-[#5B3FA8] flex-shrink-0 mt-0.5">{i+1}</span>
                <p className="text-xs text-[#6b7280] leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#F7ECD9]/50 text-xs text-[#8A5A1A]">💡 {currentTask.briefing.hint}</div>
        </div>
        <button type="button" onClick={onStart} className="px-8 py-3 rounded-xl bg-[#10A37F] text-[#1F1F1F] font-semibold hover:bg-[#0D8B6C] transition-colors">开始讲解</button>
      </div>
    </div>
  );
}

// ============ 聊天区 ============
function ChatArea({ currentTask, onReset, onTryAgain }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [round, setRound] = useState(0);
  const [typing, setTyping] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showEndBar, setShowEndBar] = useState(false);
  const chatRef = useRef(null);
  const sessionRef = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, typing, showEndBar]);
  useEffect(() => { startChat(); return () => {}; }, []); // eslint-disable-line

  const startChat = async () => {
    const sid = ++sessionRef.current;
    setTyping(true);
    try {
      if (DEMO_MODE) {
        await sleep(800);
        if (sid !== sessionRef.current) return;
        setMessages([{ role:'ai', text: DEMO_RESPONSES.initial }]);
      } else {
        const payload = buildPayload([], 0, true);
        const res = await feynmanChat(payload);
        if (sid !== sessionRef.current) return;
        setMessages([{ role:'ai', text: stripMarkdown(res.data.reply) }]);
      }
    } catch {
      if (sid !== sessionRef.current) return;
      setMessages([{ role:'ai', text: `同学你好！今天换你来当老师，给我讲讲「${currentTask.topic}」吧。` }]);
    }
    if (sid === sessionRef.current) setTyping(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const buildPayload = (msgs, rnd, isInit) => ({
    topic: currentTask.topic,
    goal: currentTask.briefing.goal,
    requirements: FEYNMAN_REQUIREMENTS,
    hint: currentTask.briefing.hint,
    messages: msgs, round: rnd, isInitial: isInit,
  });

  const handleSend = async () => {
    if (!input.trim() || typing || showEndBar) return;
    const sid = sessionRef.current;
    const userMsg = { role:'user', text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput('');
    const nextRound = round + 1;
    setRound(nextRound);
    setTyping(true);

    try {
      if (DEMO_MODE) {
        await sleep(1000 + Math.random() * 600);
        if (sid !== sessionRef.current) return;
        if (nextRound < 5) {
          setMessages(prev => [...prev, { role:'ai', text: DEMO_RESPONSES.followups[nextRound - 1] }]);
        } else {
          setMessages(prev => [...prev, { role:'ai', text: '聊了这么多，我来帮你总结一下——' }]);
          const ev = DEMO_RESPONSES.evaluation;
          setEvaluation({
            summary: ev.summary,
            scores: ev.scores.map((s, i) => ({ l: s.label, v: 80 + Math.floor(Math.random() * 16), c: SCORE_COLORS[i % SCORE_COLORS.length] })),
            gaps: ev.gaps,
            tips: ev.tips,
          });
          setShowEndBar(true);
        }
      } else {
        const payload = buildPayload(newMessages, nextRound, false);
        const res = await feynmanChat(payload);
        if (sid !== sessionRef.current) return;
        setMessages(prev => [...prev, { role:'ai', text: stripMarkdown(res.data.reply) }]);
        if (res.data.evaluation) {
          setEvaluation({
            summary: res.data.evaluation.summary || '',
            scores: (res.data.evaluation.scores || []).map((s, i) => ({ l: s.label, v: s.value, c: SCORE_COLORS[i % SCORE_COLORS.length] })),
            gaps: res.data.evaluation.gaps || [],
            tips: res.data.evaluation.tips || [],
          });
          setShowEndBar(true);
        }
      }
    } catch {
      if (sid !== sessionRef.current) return;
      setMessages(prev => [...prev, { role:'ai', text: '请继续讲，我在认真听呢。' }]);
    }
    if (sid === sessionRef.current) setTyping(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  return (
    <>
      {!showEndBar && (
        <div className="px-5 py-2 bg-[#F7ECD9]/40 border-b border-[#F7ECD9] flex-shrink-0">
          <p className="text-xs text-[#8A5A1A] text-center">第 {round} / 5 轮 · 还剩 {5 - round} 次对话</p>
        </div>
      )}

      <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 p-5">
        {messages.map((m,i)=>(
          <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
            <div className="max-w-[80%]">
              <div className={`flex items-start gap-3 ${m.role==='user'?'flex-row-reverse':''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role==='user'?'bg-[#10A37F]/30':'bg-[#E9E2F7]/40'}`}>
                  {m.role==='user' ? (
                    <svg className="h-4 w-4 text-[#5C7A10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="14" rx="2"/><path strokeLinecap="round" d="M8 21h8M12 17v4"/></svg>
                  ) : (
                    <svg className="h-4 w-4 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  )}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role==='user'?'bg-[#10A37F]/25 text-[#1F1F1F] border border-[#10A37F]/30':'bg-[#f3f4f6] text-[#374151]'}`}>{m.text}</div>
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#f3f4f6]">
              <div className="flex gap-1">{[...Array(3)].map((_,i)=>(<span key={i} className="w-2 h-2 rounded-full bg-[#9ca3af] animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>))}</div>
            </div>
          </div>
        )}

        {/* 评估报告 */}
        {evaluation && (
          <div className="p-5 rounded-2xl bg-white border border-[#f3f4f6] shadow-sm">
            <h3 className="font-bold text-center mb-3 text-sm">📋 评估报告</h3>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {evaluation.scores.map(s=>(<div key={s.l} className="p-2 rounded-xl text-center" style={{backgroundColor:s.c}}><p className="text-[9px]">{s.l}</p><p className="text-lg font-bold">{s.v}%</p></div>))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="font-semibold text-[#c0392b] mb-1">漏洞</p>{evaluation.gaps.map((g,i)=><p key={i} className="text-[#7B7B7B]">• {g}</p>)}</div>
              <div><p className="font-semibold text-[#1A7A57] mb-1">建议</p>{evaluation.tips.map((t,i)=><p key={i} className="text-[#7B7B7B]">• {t}</p>)}</div>
            </div>
          </div>
        )}

        {/* 结束操作栏——内联在聊天中 */}
        {showEndBar && (
          <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#e0e4dc] text-center">
            <p className="text-sm font-medium text-[#1F1F1F] mb-3">{evaluation?.summary || '本次讲解结束'}</p>
            <p className="text-xs text-[#7B7B7B] mb-4">要不要再来一轮？换个话题继续练。</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={onTryAgain} className="px-6 py-2.5 rounded-xl bg-[#10A37F] text-[#1F1F1F] text-sm font-semibold hover:bg-[#0D8B6C] transition-colors">再来一次</button>
              <button type="button" onClick={onReset} className="px-6 py-2.5 rounded-xl bg-[#f0f1f3] text-[#5a5f66] text-sm font-medium hover:bg-[#e3e5e8] transition-colors">返回简报</button>
            </div>
          </div>
        )}
      </div>

      {/* 输入栏 */}
      {!showEndBar && (
        <div className="flex items-center gap-3 p-4 bg-white border border-[#ECECEC] flex-shrink-0 shadow-sm mx-5 mb-4 rounded-2xl">
          <input ref={inputRef} className="flex-1 bg-transparent text-sm placeholder:text-[#A0A0A0] focus:outline-none" placeholder="输入你的讲解..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!typing)handleSend()}} disabled={typing}/>
          <button type="button" onClick={handleSend} disabled={!input.trim()||typing} className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors disabled:opacity-50 flex-shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
          </button>
        </div>
      )}
    </>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============ 主组件 ============
const FeynmanMode = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPicker, setShowPicker] = useState(true);
  const [phase, setPhase] = useState('briefing');
  const [resetKey, setResetKey] = useState(0);

  const fileName = selectedFile?.name?.replace('.md','') || '线程与进程';
  const currentTask = TASKS.find(t => fileName.includes(t.topic.split('的')[0])) || TASKS[0];

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 140px)', color: '#1F1F1F' }}>
      {showPicker && <FilePicker title="选择讲解文件" onSelect={(f)=>{setSelectedFile(f);setShowPicker(false);}} onCancel={()=>setShowPicker(false)}/>}

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl shadow-sm border border-[#f3f4f6] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div className="flex items-center gap-3">
            {phase !== 'briefing' && (
              <button type="button" onClick={()=>{setPhase('briefing');setResetKey(k=>k+1);}} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f0f1f3] hover:bg-[#e3e5e8] transition-colors flex-shrink-0">
                <svg className="h-5 w-5 text-[#5a5f66]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
              </button>
            )}
            <div><h1 className="text-xl font-bold text-[#1F1F1F]">费曼模式</h1><p className="text-xs text-[#7B7B7B] font-medium">能讲清楚，才算真正掌握</p></div>
          </div>
          <button type="button" onClick={()=>setShowPicker(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f1f3] text-sm font-medium text-[#5a5f66] hover:bg-[#e3e5e8] transition-colors">
            <svg width="20" height="16" viewBox="0 0 36 30" fill="none" className="flex-shrink-0"><path d="M2 7a2.5 2.5 0 012.5-2.5h8.5l3 2h13.5a2.5 2.5 0 012.5 2.5V24a2.5 2.5 0 01-2.5 2.5H4.5A2.5 2.5 0 012 24V7z" fill="#F7ECD9" stroke="#E5D9B0" strokeWidth="1.5"/><path d="M2 9v15a2.5 2.5 0 002.5 2.5h24a2.5 2.5 0 002.5-2.5V9H2z" fill="#FFFDF5" stroke="#E5D9B0" strokeWidth="1.5"/></svg>
            {selectedFile ? `${selectedFile.course} / ${selectedFile.name}` : '选择讲解文件...'}
          </button>
        </div>

        {phase === 'briefing' ? (
          <BriefingCard key={`briefing-${resetKey}`} fileName={fileName} currentTask={currentTask} onStart={()=>setPhase('chat')}/>
        ) : (
          <ChatArea key={`chat-${resetKey}`} currentTask={currentTask} onReset={()=>{setPhase('briefing');setResetKey(k=>k+1);}} onTryAgain={()=>setResetKey(k=>k+1)}/>
        )}
      </div>
    </div>
  );
};

export default FeynmanMode;
