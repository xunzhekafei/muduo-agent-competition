import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePicker } from '../../shared/components';
import { apiRequest } from '../../api/client';
import {
  fetchMemoryCards,
  generateMemoryCards,
  pollAiTask,
  createMemoryCard,
  updateMemoryCard,
  deleteMemoryCard,
  selectMemoryCycle,
} from '../../api/memory';
import MemoryCycleSelector from './MemoryCycleSelector';
import MemoryReview from './MemoryReview';

// ── 常量 ──

const CARD_TYPES = ['概念定义', '填空卡片', '辨析卡片', '翻转问答'];

const DIFFICULTY_COLORS = {
  '简单': { bg: '#D7EFE4', text: '#1A7A57' },
  '中等': { bg: '#E2EBF7', text: '#2C5282' },
  '困难': { bg: '#E9E2F7', text: '#5B3FA8' },
};

const CARD_TYPE_STYLES = {
  '概念定义': 'bg-[#E2EBF7] text-[#2C5282]',
  '填空卡片': 'bg-[#D7EFE4] text-[#1A7A57]',
  '辨析卡片': 'bg-[#E9E2F7] text-[#5B3FA8]',
  '翻转问答': 'bg-[#DDF0EA] text-[#0B7A5E]',
};

// ── 工具函数 ──

function mapApiCard(c) {
  const typeTag = (c.tags || []).find((t) => t.startsWith('type:'));
  const diffTag = (c.tags || []).find((t) => t.startsWith('difficulty:'));
  const front = c.front || c.question || '';
  const back = c.back || c.answer || '';
  return {
    id: c.id,
    type: typeTag ? typeTag.replace('type:', '') : (c.cardType || c.type || '概念定义'),
    front,
    back,
    content: front,
    answer: back,
    difficulty: diffTag ? diffTag.replace('difficulty:', '') : (c.difficulty || '中等'),
    status: c.status || '待确认',
    tags: c.tags || [],
    sourcePosition: 'AI 生成',
  };
}

// ── 组件 ──

const MemoryMode = ({ noteId: initialNoteId, noteStatus, noteMeta, onClose, onComplete }) => {
  const navigate = useNavigate();

  const isExistingNote = noteStatus === 'active' || noteStatus === 'completed';

  // 步骤: select-note → analyzing → generating → cards-generated → choose-cycle → manage-cards
  const [step, setStep] = useState(() => {
    if (!initialNoteId) return 'select-note';
    return isExistingNote ? 'loading-cards' : 'analyzing';
  });
  const [note, setNote] = useState(noteMeta ? { id: initialNoteId, title: noteMeta.title, course: noteMeta.course } : null);
  const [cards, setCards] = useState([]);
  const [cycle, setCycle] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [reviewing, setReviewing] = useState(false);

  // 编辑态
  const [editingCard, setEditingCard] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // 手动添加卡片
  const [addingCard, setAddingCard] = useState(false);
  const [newType, setNewType] = useState('概念定义');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState(0);
  const [editingPreviewId, setEditingPreviewId] = useState(null);
  const [editPreviewFront, setEditPreviewFront] = useState('');
  const [editPreviewBack, setEditPreviewBack] = useState('');
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const appliedSuggestionsRef = useRef(new Set()); // 防止重复应用同一建议

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (msg) => setToast(msg);

  // ── AI 解析过程 (假进度) ──

  const ANALYZE_STAGES = [
    { label: '正在读取笔记内容...', icon: '📖' },
    { label: '识别知识结构与核心概念...', icon: '🔍' },
    { label: '提取关键知识点...', icon: '🧠' },
    { label: '生成四种类型记忆卡片...', icon: '✨' },
  ];

  const startAnalyzing = (nid) => {
    setAnalyzing(true);
    setAnalyzeStage(0);

    const timers = ANALYZE_STAGES.map((_, i) => {
      return setTimeout(() => {
        setAnalyzeStage(i + 1);
      }, (i + 1) * 800);
    });

    // 所有阶段完成后调用生成
    const total = ANALYZE_STAGES.length * 800 + 400;
    const finalTimer = setTimeout(async () => {
      await generateForNote(nid);
      setAnalyzing(false);
    }, total);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  };

  // 加载已有笔记的卡片
  const loadExistingCards = async (nid) => {
    setLoading(true);
    try {
      const res = await fetchMemoryCards({ sourceNoteId: nid, pageSize: 100 });
      const raw = res.data || [];
      const mapped = (Array.isArray(raw) ? raw : []).map(mapApiCard);
      setCards(mapped);
      setStep('manage-cards');
      showToast(`已加载 ${mapped.length} 张记忆卡片`);
    } catch {
      showToast('加载卡片失败');
      setStep('select-note');
    }
    setLoading(false);
  };

  // 如果有 noteId，自动开始生成/加载
  useEffect(() => {
    if (initialNoteId && step === 'analyzing') {
      startAnalyzing(initialNoteId);
    } else if (initialNoteId && step === 'loading-cards') {
      loadExistingCards(initialNoteId);
    }
  }, [initialNoteId]);

  const generateForNote = async (nid) => {
    setGenerating(true);
    try {
      const res = await generateMemoryCards(nid);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error('No taskId');

      // 轮询等待任务完成
      const task = await pollAiTask(taskId, 1500, 60);
      const raw = (task.output && task.output.cards) ? task.output.cards : [];
      const mapped = (Array.isArray(raw) ? raw : []).map((c) => ({
        id: c.id || `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: c.type || '概念定义',
        front: c.front || c.question || '',
        back: c.back || c.answer || '',
        content: c.front || c.question || '',
        answer: c.back || c.answer || '',
        difficulty: c.difficulty || '中等',
        status: '待确认',
        tags: c.tags || [],
        sourcePosition: 'AI 生成',
      }));
      setCards(mapped);
      appliedSuggestionsRef.current = new Set();
      setStep('cards-generated');
    } catch {
      showToast('卡片生成失败，请检查后端是否启动');
      setStep('manage-cards');
    }
    setGenerating(false);
  };

  // ── 笔记选择 ──

  const handleNoteSelect = (file) => {
    setNote({ id: file.id, title: file.name || file.title, course: file.course || '' });
    setStep('analyzing');
    startAnalyzing(file.id);
  };

  // ── 周期确认 ──

  const handleCycleConfirm = async () => {
    setLoading(true);
    try {
      if (note) {
        // 保存所有卡片：AI生成的已由后端存过，但前端可能编辑过，统一用 update
        // 手动添加和AI建议的卡片需要 create
        for (const c of cards) {
          const payload = {
            front: c.front || c.content || '',
            back: c.back || c.answer || '',
            sourceNoteId: note.id,
            tags: [`type:${c.type || '概念定义'}`, `difficulty:${c.difficulty || '中等'}`],
          };
          try {
            if (c.sourcePosition === 'AI 生成') {
              // 后端已存，前端可能编辑过，用 update 同步
              await updateMemoryCard(c.id, { front: payload.front, back: payload.back, tags: payload.tags });
            } else {
              // 手动添加 或 AI 建议 → create
              await createMemoryCard(payload);
            }
          } catch { /* 后端不可用也继续 */ }
        }
        await selectMemoryCycle(note.id, cycle);
      }
    } catch { /* 后端不可用时继续 */ }
    setLoading(false);
    showToast('记忆计划已创建');

    setCards((prev) => prev.map((c) => ({ ...c, status: '已保留' })));
    setTimeout(() => handleClose(), 600);
  };

  // ── 卡片操作 ──

  const handleCardAction = (action, card) => {
    if (action === '记忆') { setReviewing(true); }
    else if (action === '删除') { setCards((p) => p.filter((c) => c.id !== card.id)); showToast('已删除'); }
    else if (action === '保留') { setCards((p) => p.map((c) => c.id === card.id ? { ...c, status: '已保留' } : c)); showToast('已保留'); }
    else if (action === '优化') { setCards((p) => p.map((c) => c.id === card.id ? { ...c, status: '需优化' } : c)); showToast('已标记为需优化'); }
  };

  const startEdit = (card) => {
    setEditingCard(card.id);
    setEditFront(card.front || card.content);
    setEditBack(card.back || card.answer);
  };

  const saveEdit = async (cardId) => {
    try {
      await updateMemoryCard(cardId, { front: editFront, back: editBack });
      setCards((p) => p.map((c) => c.id === cardId ? { ...c, front: editFront, back: editBack, content: editFront, answer: editBack, status: c.status === '待确认' ? '已保留' : c.status } : c));
      showToast('已保存');
    } catch {
      // 后端不可用时仍然保存到本地状态
      setCards((p) => p.map((c) => c.id === cardId ? { ...c, front: editFront, back: editBack, content: editFront, answer: editBack, status: c.status === '待确认' ? '已保留' : c.status } : c));
      showToast('已保存修改');
    }
    setEditingCard(null);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/memory-mode');
    }
  };

  // ── 生成卡片(手动) ──

  const [showRegenDialog, setShowRegenDialog] = useState(false);

  const handleManualGenerate = () => { setShowRegenDialog(true); };

  const doRegenerate = async (mode) => {
    setShowRegenDialog(false);
    if (mode === 'replace') {
      // 删除该笔记下所有已有卡片（前后端都清）
      for (const c of cards) {
        try { await deleteMemoryCard(c.id); } catch {}
      }
      setCards([]);
    }
    if (note?.id) { setStep('analyzing'); startAnalyzing(note.id); }
    else { setStep('select-note'); }
  };

  // ── 统计 ──

  const cardStats = useMemo(() => {
    const types = {};
    cards.forEach((c) => { types[c.type] = (types[c.type] || 0) + 1; });
    const distribution = {};
    CARD_TYPES.forEach((t) => { distribution[t] = types[t] || 0; });
    return { totalCards: cards.length, typeDistribution: distribution };
  }, [cards]);

  // ── 过滤 ──

  const filtered = filterStatus === '全部' ? cards : cards.filter((c) => c.status === filterStatus);

  // ── 沉浸式复习 ──

  if (reviewing) {
    return <MemoryReview cards={cards} noteId={note?.id} onExit={() => setReviewing(false)} />;
  }

  // ── 步骤: 选择笔记 ──

  if (step === 'select-note') {
    return (
      <div className="space-y-5">
        <FilePicker
          title="选择记忆复习文件"
          onSelect={handleNoteSelect}
          onCancel={handleClose}
        />
      </div>
    );
  }

  // ── 步骤: AI 解析中 ──

  if (step === 'analyzing' || analyzing) {
    return (
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(16,163,127,0.15)' }}>
            <svg className="h-8 w-8" style={{ color: '#8ab820' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-1">AI 正在解析笔记</h2>
          <p className="text-sm text-[#7B7B7B]">
            {note?.title || '笔记'} — 正在提取核心知识点
          </p>
        </div>

        {/* 阶段指示器 */}
        <div className="max-w-sm mx-auto space-y-3 mb-6">
          {ANALYZE_STAGES.map((s, i) => {
            const done = i < analyzeStage;
            const current = i === analyzeStage;
            const pending = i > analyzeStage;
            return (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-300" style={{
                backgroundColor: done ? 'rgba(16,163,127,0.08)' : current ? 'rgba(16,163,127,0.04)' : 'transparent',
              }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all duration-300 ${
                  done ? 'bg-[#10A37F]' : current ? 'bg-[#f3f4f6] animate-pulse' : 'bg-[#f3f4f6]'
                }`}>
                  {done ? (
                    <svg className="h-4 w-4 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className="text-[10px] text-[#A0A0A0]">{s.icon}</span>
                  )}
                </div>
                <span className={`text-sm transition-all duration-300 ${
                  done ? 'font-semibold text-[#1F1F1F]' : current ? 'font-medium text-[#1F1F1F]' : 'text-[#A0A0A0]'
                }`}>
                  {s.label}
                </span>
                {current && (
                  <div className="flex gap-0.5 ml-auto">
                    <div className="w-1 h-1 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 进度条 */}
        <div className="max-w-sm mx-auto">
          <div className="h-1.5 rounded-full bg-[#f3f4f6] overflow-hidden">
            <div className="h-full rounded-full bg-[#10A37F] transition-all duration-500" style={{ width: `${(analyzeStage / ANALYZE_STAGES.length) * 100}%` }} />
          </div>
          <p className="text-[10px] text-[#A0A0A0] text-center mt-2">
            {analyzeStage < ANALYZE_STAGES.length ? `${Math.round((analyzeStage / ANALYZE_STAGES.length) * 100)}%` : '即将完成...'}
          </p>
        </div>
      </div>
    );
  }

  // ── 步骤: 生成中 / 加载中 ──

  if (step === 'generating' || step === 'loading-cards' || generating || loading) {
    const isGenerating = step === 'generating' || generating;
    return (
      <div className="card p-12 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#10A37F] border-t-transparent animate-spin" />
        <h2 className="text-lg font-bold text-[#1F1F1F]">
          {isGenerating ? 'AI 正在解析生成记忆卡片...' : '正在加载记忆卡片...'}
        </h2>
        <p className="text-sm text-[#7B7B7B]">
          {isGenerating
            ? '已提交 AI 任务，DeepSeek 正在分析笔记内容，提取核心知识点生成四种类型卡片，请耐心等待...'
            : `${note?.title || '笔记'}的记忆卡片`}
        </p>
        <button onClick={handleClose} className="text-sm font-semibold text-[#7B7B7B] hover:text-[#1F1F1F] px-4 py-2 rounded-xl hover:bg-black/[0.03] transition-colors">
          取消
        </button>
      </div>
    );
  }

  // ── 手动添加卡片 ──

  const handleAddCard = () => {
    if (!newFront.trim() || !newBack.trim()) { showToast('请填写问题和答案'); return; }
    const card = {
      id: `card_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: newType,
      front: newFront.trim(),
      back: newBack.trim(),
      content: newFront.trim(),
      answer: newBack.trim(),
      difficulty: '中等',
      status: '待确认',
      tags: [`type:${newType}`],
      sourcePosition: '手动添加',
    };
    setCards((prev) => [...prev, card]);
    setNewFront('');
    setNewBack('');
    setNewType('概念定义');
    setAddingCard(false);
    showToast('卡片已添加');
  };

  // ── 预览卡片内联编辑 ──
  const startEditPreview = (card) => {
    setEditingPreviewId(card.id);
    setEditPreviewFront(card.front || card.content);
    setEditPreviewBack(card.back || card.answer);
  };

  const saveEditPreview = (cardId) => {
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, front: editPreviewFront, back: editPreviewBack, content: editPreviewFront, answer: editPreviewBack } : c));
    setEditingPreviewId(null);
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    const userMsg = { role: 'user', content: msg };
    const updated = [...aiChat, userMsg];
    setAiChat(updated);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await apiRequest('/api/v1/memory/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: updated, cards }),
      });
      setAiChat((prev) => [...prev, { role: 'ai', content: res?.data?.reply || '收到' }]);
    } catch {
      setAiChat((prev) => [...prev, { role: 'ai', content: '抱歉，AI服务暂时不可用' }]);
    }
    setAiLoading(false);
  };

  // 从 AI 回复中提取卡片内容
  const extractCardsFromText = (text) => {
    const cards = [];
    // 按 --- 分隔多个卡片块
    const blocks = text.split(/---+/);
    for (const block of blocks) {
      // 匹配 类型：xxx / 问题：xxx / 答案：xxx
      const typeMatch = block.match(/类型[：:]\s*(.+)/);
      const frontMatch = block.match(/(?:问题|问|Q)[：:]\s*([\s\S]+?)(?=(?:答案|答|A)[：:]|类型[：:]|---|$)/);
      const backMatch = block.match(/(?:答案|答|A)[：:]\s*([\s\S]+?)(?=类型[：:]|---|$)/);
      if (frontMatch && backMatch) {
        const front = frontMatch[1].trim();
        const back = backMatch[1].trim();
        if (front && back) {
          const type = (typeMatch ? typeMatch[1].trim() : '概念定义');
          cards.push({ type, front, back, difficulty: '中等' });
        }
      }
    }
    return cards;
  };

  // 从 AI 回复中解析出卡片并应用
  const applyAiSuggestion = (aiContent, msgIdx) => {
    if (appliedSuggestionsRef.current.has(msgIdx)) return;
    const extracted = extractCardsFromText(aiContent);
    if (extracted.length === 0) {
      showToast('未识别到可添加的卡片');
      return;
    }
    const newCards = extracted.map((c, i) => ({
      id: `card_ai_${Date.now()}_${Math.random().toString(36).slice(2,6)}_${i}`,
      type: c.type || '概念定义',
      front: c.front, back: c.back,
      content: c.front, answer: c.back,
      difficulty: c.difficulty || '中等',
      status: '待确认',
      sourcePosition: 'AI 建议',
      tags: [`type:${c.type || '概念定义'}`, `difficulty:${c.difficulty || '中等'}`],
    }));
    setCards(prev => [...prev, ...newCards]);
    appliedSuggestionsRef.current.add(msgIdx);
    showToast(`已添加 ${newCards.length} 张卡片`);
  };

  // ── 步骤: 卡片已生成，预览 ──

  if (step === 'cards-generated') {
    return (
      <div className="flex gap-5" style={{ height: 'calc(100vh - 140px)' }}>
        {/* 左侧：卡片列表 */}
        <div className="flex-1 card p-5 flex flex-col min-w-0">
          <div className="flex-shrink-0">
            <h2 className="font-semibold text-[#1F1F1F]">AI 已生成 {cards.length} 张记忆卡片</h2>
            <p className="text-xs text-[#7B7B7B] mt-0.5">点击卡片文字可直接修改</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-4">
            {cards.map((card) => {
              const isEditing = editingPreviewId === card.id;
              return (
                <div key={card.id} className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.012)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${CARD_TYPE_STYLES[card.type] || CARD_TYPE_STYLES['概念定义']}`}>{card.type}</span>
                    <button onClick={() => isEditing ? saveEditPreview(card.id) : startEditPreview(card)} className="text-[10px] font-semibold text-[#7B7B7B] hover:text-[#1F1F1F] px-2 py-0.5 rounded-lg hover:bg-black/[0.03] transition-colors">
                      {isEditing ? '保存' : '编辑'}
                    </button>
                  </div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input className="w-full text-sm p-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={editPreviewFront} onChange={(e) => setEditPreviewFront(e.target.value)} placeholder="问题..." />
                      <input className="w-full text-sm p-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={editPreviewBack} onChange={(e) => setEditPreviewBack(e.target.value)} placeholder="答案..." />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[#1F1F1F]">{card.front || card.content}</p>
                      <p className="text-xs text-[#A0A0A0] mt-1">{card.back || card.answer}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-shrink-0 flex items-center gap-3 mt-4 pt-4 border-t border-[#f3f4f6]">
            {!addingCard && (
              <button onClick={() => setAddingCard(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#f0f1f3] text-[#5a5f66] hover:bg-[#e3e5e8] transition-colors">
                + 手动添加卡片
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setStep('choose-cycle')} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">
              下一步：选择记忆周期
            </button>
            <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#7B7B7B] hover:bg-black/[0.03] transition-colors">
              关闭
            </button>
          </div>

          {/* 手动添加卡片表单 */}
          {addingCard && (
            <div className="flex-shrink-0 mt-4 p-4 rounded-2xl border-2 border-[#10A37F]/40" style={{ backgroundColor: 'rgba(16,163,127,0.06)' }}>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-sm px-3 py-1.5 rounded-xl bg-[#f3f4f6] border-none focus:outline-none focus:ring-1 focus:ring-[#10A37F] mb-2">
                {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="w-full text-sm p-2.5 rounded-xl border border-[#e5e7eb] mb-2 focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="问题（正面）" />
              <input className="w-full text-sm p-2.5 rounded-xl border border-[#e5e7eb] mb-2 focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="答案（背面）" />
              <div className="flex items-center gap-2">
                <button onClick={handleAddCard} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">添加</button>
                <button onClick={() => { setAddingCard(false); setNewFront(''); setNewBack(''); }} className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#7B7B7B] hover:bg-black/[0.03] transition-colors">取消</button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：AI 助手 — 可折叠 */}
        {aiPanelOpen ? (
          <div className="w-[380px] flex-shrink-0 flex flex-col">
            <div className="card flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-[#ECECEC] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#10A37F]/30">
                    <svg className="h-5 w-5 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#1F1F1F]">AI 卡片助手</h3>
                    <p className="text-[10px] text-[#A0A0A0]">不满意卡片？告诉AI帮你调整</p>
                  </div>
                  <button onClick={() => setAiPanelOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                    <svg className="h-4 w-4 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiChat.length === 0 && (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3">
                        <svg className="h-6 w-6 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
                      </div>
                      <p className="text-sm text-[#A0A0A0]">告诉我你想怎么<br/>调整这些卡片</p>
                    </div>
                  </div>
                )}
                {aiChat.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] ${m.role === 'ai' ? 'w-full' : ''}`}>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#10A37F]/20 text-[#1F1F1F]' : 'bg-[#f5f5f5] text-[#4a4a4a]'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.content}
                      </div>
                    </div>
                    {m.role === 'ai' && m.content && m.content.length > 20 && !appliedSuggestionsRef.current.has(i) && (
                      <button
                        onClick={() => applyAiSuggestion(m.content, i)}
                        className="mt-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold bg-[#10A37F]/40 text-[#1F1F1F] hover:bg-[#10A37F] transition-colors"
                      >
                        + 应用此建议
                      </button>
                    )}
                    {m.role === 'ai' && appliedSuggestionsRef.current.has(i) && (
                      <span className="mt-1 px-2 py-0.5 text-[10px] text-[#7B7B7B]">已应用</span>
                    )}
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-2xl bg-[#f5f5f5]">
                      <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[#A0A0A0] animate-bounce" /><div className="w-2 h-2 rounded-full bg-[#A0A0A0] animate-bounce" style={{ animationDelay: '0.15s' }} /><div className="w-2 h-2 rounded-full bg-[#A0A0A0] animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#ECECEC] flex items-center gap-2 flex-shrink-0">
                <input className="flex-1 py-2.5 px-4 rounded-xl bg-[#f5f5f5] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#10A37F]/40" placeholder="输入你想调整的内容..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAiMessage()} />
                <button onClick={sendAiMessage} className="w-10 h-10 rounded-xl bg-[#10A37F] flex items-center justify-center text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setAiPanelOpen(true)} className="w-10 flex-shrink-0 card flex items-center justify-center hover:bg-[#f3f4f6] transition-colors" title="展开AI助手">
            <svg className="h-5 w-5 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
        )}
      </div>
    );
  }

  // ── 步骤: 选择周期 ──

  if (step === 'choose-cycle') {
    return (
      <div className="space-y-5">
        <MemoryCycleSelector
          selected={cycle}
          onSelect={setCycle}
          onConfirm={handleCycleConfirm}
          onCancel={() => setStep('cards-generated')}
        />

        {/* 不可更改提示 */}
        <div className="card p-4 border-2 border-[#F7ECD9]" style={{ backgroundColor: '#FFFDF5' }}>
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#e6a817' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#8A5A1A]">选择记忆周期后将不可更改</p>
              <p className="text-xs text-[#8a6a2a] mt-0.5">确认后将无法在记忆库中调整复习周期，请根据学习目标谨慎选择</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 步骤: 管理卡片 (默认) ──

  const CYCLE_SCHEDULE = {
    cram: ['第1天', '第2天', '第4天', '第7天', '第14天'],
    standard: ['第1天', '第3天', '第7天', '第15天', '第30天', '第60天'],
    longterm: ['第1天', '第3天', '第7天', '第15天', '第30天', '第90天', '第180天'],
  };

  const CYCLE_INFO = {
    cram: { title: '考前冲刺', desc: '30天内考试', color: '#fce4e4', text: '#c0392b' },
    standard: { title: '标准学习', desc: '日常课程', color: '#E2EBF7', text: '#2C5282' },
    longterm: { title: '长期掌握', desc: '考研 / 核心课', color: '#E9E2F7', text: '#5B3FA8' },
  };

  const ACTION_STYLES = {
    '记忆': { bg: '#D7EFE4', text: '#1A7A57', hover: '#BFE5D9' },
    '删除': { bg: '#fce4e4', text: '#c0392b', hover: '#f5d0d0' },
    '编辑': { bg: '#E2EBF7', text: '#2C5282', hover: '#b8cff0' },
    '保留': { bg: '#10A37F', text: '#1F1F1F', hover: '#0D8B6C' },
    '优化': { bg: '#F7ECD9', text: '#8A5A1A', hover: '#fde8c0' },
  };

  const ci = CYCLE_INFO[cycle] || CYCLE_INFO.standard;
  const schedule = CYCLE_SCHEDULE[cycle] || CYCLE_SCHEDULE.standard;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-[#1F1F1F]" style={{ backgroundColor: '#10A37F' }}>
          {toast}
        </div>
      )}

      {showRegenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-base font-semibold text-[#1F1F1F] mb-1">重新生成</p>
            <p className="text-sm text-[#7B7B7B] mb-5">如何处理已有的记忆卡片？</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => doRegenerate('add')} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">添加新卡片（保留原有）</button>
              <button onClick={() => doRegenerate('replace')} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#fce4e4] text-[#c0392b] hover:bg-[#f5d0d0] transition-colors">覆盖原有卡片（删除旧的）</button>
              <button onClick={() => setShowRegenDialog(false)} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#f3f4f6] text-[#7B7B7B] hover:bg-[#e5e7eb] transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-[#f3f4f6] transition-colors">
              <svg className="h-5 w-5 text-[#7B7B7B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#1F1F1F]">{note?.title || '记忆模式'}</h1>
              {note?.course && <p className="text-xs text-[#7B7B7B]">{note.course}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleManualGenerate} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#f0f1f3] text-[#5a5f66] hover:bg-[#e3e5e8] transition-colors">
              重新生成
            </button>
            <button onClick={() => setReviewing(true)} className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">
              开始记忆 ({cards.length})
            </button>
          </div>
        </div>
      </div>

      {/* 主区域 */}
      <div className="grid grid-cols-12 gap-5">
        {/* 卡片列表 */}
        <div className="col-span-8 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1F1F1F]">记忆卡片 · {cards.length} 张</h2>
            <button onClick={() => setAddingCard(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f0f1f3] text-[#5a5f66] hover:bg-[#e3e5e8] transition-colors">
              + 手动添加
            </button>
          </div>

          {/* 手动添加卡片表单 */}
          {addingCard && (
            <div className="mb-4 p-4 rounded-2xl border-2 border-[#10A37F]/40" style={{ backgroundColor: 'rgba(16,163,127,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-[#7B7B7B]">类型</span>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-sm px-3 py-1.5 rounded-xl bg-[#f3f4f6] border-none focus:outline-none focus:ring-1 focus:ring-[#10A37F]">
                  {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input className="w-full text-sm p-2.5 rounded-xl border border-[#e5e7eb] mb-2 focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="问题（正面）" />
              <input className="w-full text-sm p-2.5 rounded-xl border border-[#e5e7eb] mb-3 focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="答案（背面）" />
              <div className="flex items-center gap-2">
                <button onClick={handleAddCard} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors">添加</button>
                <button onClick={() => { setAddingCard(false); setNewFront(''); setNewBack(''); }} className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#7B7B7B] hover:bg-black/[0.03] transition-colors">取消</button>
              </div>
            </div>
          )}

          <div className="space-y-2" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            {cards.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#9ca3af]">暂无卡片，请先生成</div>
            ) : (
              cards.map((card) => {
                const isEditing = editingCard === card.id;
                return (
                  <div key={card.id} className="p-5 rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.012)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${CARD_TYPE_STYLES[card.type] || CARD_TYPE_STYLES['概念定义']}`}>{card.type}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mb-3">
                        <input className="w-full text-sm p-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={editFront} onChange={(e) => setEditFront(e.target.value)} placeholder="问题..." />
                        <input className="w-full text-sm p-2 rounded-lg border border-[#e5e7eb] focus:outline-none focus:ring-1 focus:ring-[#10A37F]" value={editBack} onChange={(e) => setEditBack(e.target.value)} placeholder="答案..." />
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-semibold text-[#1F1F1F] mb-3 leading-relaxed">{card.front || card.content}</p>
                        <p className="text-sm text-[#5a5f66] mb-3 leading-relaxed" style={{ backgroundColor: 'rgba(16,163,127,0.08)', padding: '10px 14px', borderRadius: '10px' }}>{card.back || card.answer}</p>
                      </>
                    )}

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(card.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#10A37F] text-[#1f2937] hover:bg-[#0D8B6C] transition-colors">保存</button>
                          <button onClick={() => setEditingCard(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#7B7B7B] hover:bg-black/[0.03] transition-colors">取消</button>
                        </>
                      ) : (
                        ['记忆', '删除', '编辑'].map((a) => {
                          const s = ACTION_STYLES[a] || {};
                          return (
                            <button
                              key={a}
                              onClick={() => a === '编辑' ? startEdit(card) : handleCardAction(a, card)}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                              style={{ backgroundColor: s.bg, color: s.text }}
                              onMouseEnter={(e) => { if (s.hover) e.currentTarget.style.backgroundColor = s.hover; }}
                              onMouseLeave={(e) => { if (s.bg) e.currentTarget.style.backgroundColor = s.bg; }}
                            >
                              {a}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧：类型分布 + 记忆周期 */}
        <div className="col-span-4 flex flex-col gap-5">
          {/* 记忆周期 */}
          <div className="card p-5">
            <h2 className="font-semibold text-[#1F1F1F] mb-3">记忆周期</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: ci.color, color: ci.text }}>{ci.title}</span>
              <span className="text-xs text-[#7B7B7B]">{ci.desc}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {schedule.map((day, i) => (
                <span key={i} className="px-2.5 py-1.5 rounded-xl text-[10px] font-semibold bg-[#f3f4f6] text-[#5a5f66]">
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* 各类型分布 */}
          <div className="card p-5">
            <h2 className="font-semibold text-[#1F1F1F] mb-4">各类型分布</h2>
            <div className="space-y-3">
              {Object.entries(cardStats.typeDistribution).map(([t, c]) => (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#7B7B7B]">{t}</span><span className="text-xs font-semibold text-[#1F1F1F]">{c}</span></div>
                  <div className="h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cardStats.totalCards > 0 ? (c / cardStats.totalCards) * 100 : 0}%`, backgroundColor: '#10A37F' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryMode;
