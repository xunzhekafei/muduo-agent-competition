import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotes, fetchNoteDetail, addNoteBlock, updateNoteBlock, deleteNoteBlock } from '../../api/notes';
import { renderMarkdown } from '../../shared/renderMarkdown';
import { PageHeader, Button, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const ICON_THINKING = 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

const COACH_PROMPTS = [
  { type: 'question', text: '请用自己的话解释：什么是极限？不要直接背ε-δ定义，试着表达你对"无限接近"的理解。' },
  { type: 'gap', text: '你提到了"趋近于"，但你跳过了关键问题——"趋近"和"等于"到底有什么区别？能用一个具体例子说明吗？' },
  { type: 'challenge', text: '你说极限存在需要左右极限相等——那绝对值函数 y=|x| 在 x=0 处连续但不可导，它的极限存在吗？为什么？' },
  { type: 'compare', text: '极限存在和函数连续是什么关系？很多人觉得"极限存在函数就连续"，这是错的——你能纠正这个误区吗？' },
  { type: 'apply', text: '很好。现在假设你要教一个刚学完高中数学的学生理解极限——只能用日常生活比喻，不能出现ε-δ符号，你会怎么解释？' },
];

const BLOCK_TYPES = [
  { value: 'paragraph', label: '段落' },
  { value: 'heading', label: 'H1', level: 1 },
  { value: 'heading', label: 'H2', level: 2 },
  { value: 'heading', label: 'H3', level: 3 },
  { value: 'formula', label: '公式' },
];

const AI_HELPER_SERVICES = [
  {
    id: 'correction',
    label: '纠错',
    short: '找错',
    hint: '检查知识、逻辑和表述问题',
    placeholder: '粘贴需要纠错的段落，或直接描述你的疑问...',
  },
  {
    id: 'concept',
    label: '概念解释',
    short: '解释',
    hint: '把抽象概念讲清楚',
    placeholder: '输入想理解的概念，例如“条件概率”...',
  },
  {
    id: 'quote',
    label: '引用问答',
    short: '引用',
    hint: '围绕笔记内容追问和定位',
    placeholder: '问一个和当前笔记有关的问题...',
  },
  {
    id: 'zhToEn',
    label: '中译英',
    short: '中英',
    hint: '把中文学习表达翻成英文',
    placeholder: '输入要翻译成英文的中文内容...',
  },
  {
    id: 'enToZh',
    label: '英译中',
    short: '英中',
    hint: '把英文材料译成中文',
    placeholder: 'Paste English text here...',
  },
  {
    id: 'polish',
    label: '表达优化',
    short: '润色',
    hint: '让笔记更清晰、准确、自然',
    placeholder: '输入需要优化表达的句子或段落...',
  },
  {
    id: 'expand',
    label: '补充',
    short: '补充',
    hint: '补全例子、步骤和背景知识',
    placeholder: '输入希望 AI 补充的知识点或段落...',
  },
];

const AI_HELPER_DEMOS = {
  correction: [
    {
      role: 'helper',
      type: 'correction',
      text: '我们先不直接判定对错。你选中的这句话里有一个很适合核查的点：它把“来源机制”和“效果表现”连在了一起。你能先指出：平移不变性到底是由参数共享、滑动检测，还是池化共同带来的？',
    },
    {
      role: 'helper',
      type: 'correction',
      text: '很好。那如果只保留参数共享、不做池化，卷积核在不同位置检测同一特征时，输出图会怎样移动？这更像“不变性”，还是“等变性”？',
    },
    {
      role: 'helper',
      type: 'correction',
      text: '你已经找到修正方向了。最后一步请你自己改写原句：把“参数共享带来平移不变性”改得更严谨，并说明池化或全局汇聚在其中可能承担什么作用。',
    },
  ],
  concept: [
    {
      role: 'helper',
      type: 'concept',
      text: '先别背定义。你选中的概念可以拆成两个问题：一个深层神经元“看见”的原图范围是什么？为什么层数越深，这个范围会变大？你能先用卷积核滑动的过程解释第一问吗？',
    },
    {
      role: 'helper',
      type: 'concept',
      text: '对。那继续想：第二层的“一小块上一层区域”，其中每个点又分别看了原图的一小块。这样叠起来，原图范围会发生什么变化？',
    },
    {
      role: 'helper',
      type: 'concept',
      text: '现在请你用一句自己的话解释“感受野”，但不要使用“映射到原始图像的区域”这个原句。试着讲给一个刚学 CNN 的同学听。',
    },
  ],
  quote: [
    {
      role: 'helper',
      type: 'quote',
      text: '我们按“引用问答”的方式来做：先不要急着回答。请在这篇笔记里找两个证据，一个来自“局部连接/参数共享”，一个来自“分层特征提取”。它们分别支持 CNN 优于全连接网络的哪一部分？',
    },
    {
      role: 'helper',
      type: 'quote',
      text: '很好。现在追问一下：如果考题问“为什么优于全连接”，你会把“参数量少”和“空间信息保留”哪个放在前面？为什么？',
    },
    {
      role: 'helper',
      type: 'quote',
      text: '可以。请你用笔记中的原有段落做支撑，组织一个 3 句回答：第 1 句指出全连接的问题，第 2 句引用 CNN 两个机制，第 3 句说明分层特征带来的结果。',
    },
  ],
  zhToEn: [
    {
      role: 'helper',
      type: 'zhToEn',
      text: '我们不直接给译文，先做翻译拆解。你选中的中文里，主干是“CNN 是一种网络”，修饰信息包括“专门处理网格结构数据”和“用于计算机视觉”。你会先保留哪些术语不翻译？',
    },
    {
      role: 'helper',
      type: 'zhToEn',
      text: '好。下一步看语序：英文更适合先说 “A CNN is ...”，还是先说 “Designed for ...”？两种开头分别更像定义句还是论文摘要句？',
    },
    {
      role: 'helper',
      type: 'zhToEn',
      text: '请你先写一个定义句版本，只写主干和一个修饰从句。写完后我再追问你如何把“无需人工设计算子”自然地接进去。',
    },
  ],
  enToZh: [
    {
      role: 'helper',
      type: 'enToZh',
      text: '先别逐词翻译。把这段英文分成三类：术语、动作、结果。你能先指出哪几个词必须翻成 CNN 语境里的固定说法？',
    },
    {
      role: 'helper',
      type: 'enToZh',
      text: '很好。那如果句子里出现 “extract spatial features”，你会翻成“提取空间特征”还是“抽取空间上的特点”？为什么前者更像课程笔记？',
    },
    {
      role: 'helper',
      type: 'enToZh',
      text: '请你先给出一个中文草译，但刻意标出你不确定的术语。我们下一轮只检查术语一致性，不急着润色整句。',
    },
  ],
  polish: [
    {
      role: 'helper',
      type: 'polish',
      text: '表达优化也先不直接改。你选中的段落已经有信息量，但可以检查三个层次：结论、机制、效果。你觉得现在最像“结论”的是哪一句？',
    },
    {
      role: 'helper',
      type: 'polish',
      text: '对。那读者第一次看时，是否能马上知道“为什么要按这个顺序堆叠”？你会在哪一层之间加一句过渡？',
    },
    {
      role: 'helper',
      type: 'polish',
      text: '很好。请你尝试把原段落改成“流程句 + 关键原因 + 易错提醒”三句结构。注意我只帮你提问框架，最终表述由你自己完成。',
    },
  ],
  expand: [
    {
      role: 'helper',
      type: 'expand',
      text: '补充内容时，我们先判断缺口。你选中的知识点如果要让初学者更稳，需要补“例子”“边界”还是“和相邻概念的区别”？你先选一个。',
    },
    {
      role: 'helper',
      type: 'expand',
      text: '好，那我们用公式自己算：如果输入是 5×5，Kernel=3，Stride=1，Padding=1，代入输出尺寸公式会得到多少？这能说明什么？',
    },
    {
      role: 'helper',
      type: 'expand',
      text: '现在请你把这个例子补成两句话：第一句给参数，第二句说明它为什么帮助理解 Same Padding。先写你的版本，我再继续追问是否需要补边界情况。',
    },
  ],
};

const blockDisplayInfo = (b) => {
  if (b.type === 'heading') return { label: `H${b.level||1}`, cls: 'font-bold' };
  if (b.type === 'formula') return { label: '公式', cls: 'font-mono' };
  if (b.type === 'table') return { label: '表格', cls: '' };
  if (b.type === 'ai_summary') return { label: 'AI总结', cls: 'italic' };
  return { label: '段落', cls: '' };
};

const isMarkdownLikeBlock = (block) => (
  block.type === 'thinking' ||
  block.type === 'markdown' ||
  block.type === 'ai_summary' ||
  /^#{1,6}\s|\*\*|^\s*[-*]\s|\n\s*[-*]\s|\|.+\|/m.test(block.content || '')
);

const renderPreviewBlock = (block) => {
  const content = block.content || '';

  if (block.type === 'heading') {
    const size = block.level === 1 ? 'text-2xl mt-8 mb-4' : block.level === 2 ? 'text-lg mt-6 mb-3' : 'text-base mt-4 mb-2';
    return <h3 className={`${size} font-bold text-[#1F1F1F]`}>{content}</h3>;
  }

  if (block.type === 'formula') {
    return (
      <div className="my-4 p-5 rounded-2xl bg-[#FAFAFA] border border-[#e0e0e0] text-center">
        <code className="text-lg font-mono font-semibold text-[#1F1F1F]">{content}</code>
      </div>
    );
  }

  if (block.type === 'table') {
    return <div className="mb-5 overflow-x-auto text-sm text-[#444]" dangerouslySetInnerHTML={renderMarkdown(content)} />;
  }

  if (block.type === 'ai_summary') {
    return (
      <div className="my-5 p-5 rounded-2xl bg-[#f0faf0] border border-[#D7EFE4]/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A7A57] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#1A7A57]">AI Generated</span>
        </div>
        <div className="text-sm text-[#444] leading-relaxed" dangerouslySetInnerHTML={renderMarkdown(content)} />
      </div>
    );
  }

  if (isMarkdownLikeBlock(block)) {
    return (
      <div className="my-5 p-5 rounded-2xl bg-[#f8f6ff] border border-[#E9E2F7]/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5B3FA8] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#5B3FA8]">Markdown</span>
        </div>
        <div className="text-sm text-[#444] leading-relaxed" dangerouslySetInnerHTML={renderMarkdown(content)} />
      </div>
    );
  }

  if (/<\/?[a-z][\s\S]*>/i.test(content)) {
    return <div className="text-[15px] text-[#333] leading-[1.8] mb-4" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return <p className="text-[15px] text-[#333] leading-[1.8] mb-4 whitespace-pre-wrap">{content}</p>;
};

const ThinkingMode = () => {
  const navigate = useNavigate();
  const { askAI } = useAgent();
  const askAboutThinking = () => {
    askAI('我现在在练习思考模式，帮我针对当前正在深入的知识点，再追问几个关键问题，检验我是否真的理解');
    navigate('/agent');
  };
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [input, setInput] = useState('');
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [helperPanelOpen, setHelperPanelOpen] = useState(true);
  const [selectedHelperService, setSelectedHelperService] = useState(null);
  const [helperDemoStep, setHelperDemoStep] = useState(null);
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);
  const blockRefs = useRef({});

  // Load notes list
  useEffect(() => {
    fetchNotes({ pageSize: 100 }).then(res => {
      if (res?.data) setNotes(res.data);
    }).catch(() => {});
  }, []);

  // Load selected note
  useEffect(() => {
    if (!selectedNoteId) return;
    fetchNoteDetail(selectedNoteId).then(res => {
      const detail = res.data || res;
      const loaded = (detail.blocks || []).map(b => ({
        id: b.id,
        type: b.blockType || b.block_type || b.type || 'paragraph',
        content: b.content || '',
        position: b.position || 0,
        level: b.level || b.metadata?.level,
      }));
      setBlocks(loaded);
      setNoteTitle(detail.note?.title || detail.title || '');
      setHistory([loaded]);
      setHistoryIdx(0);
      setDirty(false);
      setLastSaved(null);
      setActiveBlockId(null);
    }).catch(() => {});
  }, [selectedNoteId]);

  // Auto-save every 10s
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (dirty && selectedNoteId) {
        handleSave(true);
      }
    }, 10000);
    return () => clearInterval(saveTimer.current);
  }, [dirty, selectedNoteId, blocks]);

  // Push to history helper
  const pushHistory = useCallback((newBlocks) => {
    setHistory(h => {
      const trimmed = h.slice(0, historyIdx + 1);
      return [...trimmed, newBlocks];
    });
    setHistoryIdx(i => i + 1);
  }, [historyIdx]);

  // Save
  const handleSave = async (auto = false) => {
    if (!selectedNoteId || saving) return;
    setSaving(true);
    try {
      // Get current blocks list
      const currentIds = blocks.map(b => b.id);
      // Get original IDs when note was loaded
      const origIds = history[0]?.map(b => b.id) || [];

      // Delete removed blocks
      for (const origId of origIds) {
        if (!currentIds.includes(origId)) {
          try { await deleteNoteBlock(selectedNoteId, origId); } catch {}
        }
      }
      // Update or create blocks
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const body = {
          content: b.content,
          blockType: b.type,
          position: i,
          metadata: b.level ? { level: b.level } : {},
        };
        if (origIds.includes(b.id)) {
          try { await updateNoteBlock(selectedNoteId, b.id, body); } catch {}
        } else {
          try {
            const res = await addNoteBlock(selectedNoteId, body);
            if (res?.data) {
              setBlocks(prev => prev.map(pb => pb.id === b.id ? { ...pb, id: res.data.id } : pb));
            }
          } catch {}
        }
      }
      setDirty(false);
      setLastSaved(new Date());
      if (history[0]) {
        // Update history baseline
        const h = [...history];
        h[0] = blocks;
        setHistory(h);
      }
    } catch {}
    setSaving(false);
  };

  // Block operations
  const updateBlock = (blockId, field, value, extraFields) => {
    setBlocks(prev => {
      const updated = prev.map(b => b.id === blockId ? { ...b, [field]: value, ...(extraFields || {}) } : b);
      pushHistory(updated);
      return updated;
    });
    setDirty(true);
  };

  const handleAddBlock = (afterIdx) => {
    const newBlock = { id: `new_${Date.now()}`, type: 'paragraph', content: '', position: afterIdx + 1 };
    setBlocks(prev => {
      const updated = [...prev.slice(0, afterIdx + 1), newBlock, ...prev.slice(afterIdx + 1)];
      pushHistory(updated);
      return updated;
    });
    setDirty(true);
    setActiveBlockId(newBlock.id);
  };

  const handleDeleteBlock = (blockId) => {
    if (blocks.length <= 1) return;
    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== blockId);
      pushHistory(updated);
      return updated;
    });
    setDirty(true);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      setBlocks(history[newIdx]);
      setDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      setBlocks(history[newIdx]);
      setDirty(true);
    }
  };

  // Text formatting (insert markers at cursor in textarea)
  const insertFormat = (blockId, marker) => {
    const el = blockRefs.current[blockId];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = marker + selected + marker;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    updateBlock(blockId, 'content', newText);
    // Restore cursor
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };

  const handleTextSelection = (event, blockId) => {
    const el = event.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end).trim();

    if (!selectedText) {
      setSelectionMenu(null);
      return;
    }

    setActiveBlockId(blockId);
    const rect = el.getBoundingClientRect();
    const pointerX = event.clientX || rect.left + Math.min(rect.width - 24, 220);
    const pointerY = event.clientY || rect.top + 28;

    setSelectionMenu({
      text: selectedText,
      blockId,
      x: Math.min(pointerX + 8, window.innerWidth - 300),
      y: Math.max(pointerY - 12, 80),
    });
  };

  // AI coach
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  const activeHelperService = AI_HELPER_SERVICES.find(s => s.id === selectedHelperService);
  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const activeBlockContent = activeBlock?.content?.trim();
  const noteContext = blocks
    .map((b) => b.content)
    .filter(Boolean)
    .join('\n')
    .slice(0, 800);

  const buildHelperDemoMessages = (service, selectedText) => {
    const demo = AI_HELPER_DEMOS[service.id] || [];
    return [
      { role: 'user', text: `请帮我对选中文本进行「${service.label}」：\n${selectedText}` },
      {
        role: 'helper',
        type: service.id,
        text: `已进入「${service.label}」演示。我会围绕这段 CNN 笔记连续追问，不直接给最终答案。选中文本：\n${selectedText}`,
      },
      demo[0],
    ];
  };

  const buildHelperResponse = (service, question) => {
    const contextLine = activeBlockContent
      ? `我会优先参考你当前选中的笔记块：“${activeBlockContent.slice(0, 80)}${activeBlockContent.length > 80 ? '...' : ''}”。`
      : noteContext
        ? `我会参考当前笔记《${noteTitle || '未命名笔记'}》的已有内容。`
        : '你还没有选择笔记，我会先按你输入的内容处理。';

    const target = question || activeBlockContent || noteContext || '当前学习材料';
    const snippets = {
      correction: `我们先做纠错定位，不直接给修正版。请你观察“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”：这里最可能混淆的是概念定义、因果关系，还是适用条件？你先选一个，我再继续追问证据。`,
      concept: `我们用三步理解概念：先说它“解决什么问题”，再说“靠什么机制”，最后找一个反例。针对“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”，你能先用一句话说它解决了 CNN 学习里的哪个问题吗？`,
      quote: `我们先回到笔记找依据。关于“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”，你能在当前笔记里找出两个能支持回答的原句吗？先不要总结，只标出证据位置。`,
      zhToEn: `先不直接翻译。请你把这段中文拆成“主语、核心谓语、术语、补充说明”四块。针对“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”，你会保留哪些 CNN 术语的英文形式？`,
      enToZh: `先不逐句译。请你先判断“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”里哪些是固定术语、哪些是普通动词。术语确定后，中文表达才不容易偏。`,
      polish: `我们先看结构，不直接润色。你这段话里哪一句是结论，哪一句是原因，哪一句是例子或限制？先标出来，再决定是否需要调换顺序。`,
      expand: `补充前先找缺口。围绕“${target.slice(0, 80)}${target.length > 80 ? '...' : ''}”，你觉得更缺一个计算例子、一个易错点，还是一个和相邻概念的对比？先选方向。`,
    };

    return `${contextLine}\n\n${snippets[service.id]}`;
  };

  const appendThinkingThenReply = (replyMessages, delay = 900) => {
    const messages = Array.isArray(replyMessages) ? replyMessages : [replyMessages];
    const thinkingId = `thinking_${Date.now()}_${Math.random()}`;

    setChatMessages(p => [
      ...p,
      {
        id: thinkingId,
        role: 'thinking',
        type: 'thinking',
        text: 'AI 正在思考',
        isThinking: true,
      },
    ]);

    setTimeout(() => {
      setChatMessages(p => [
        ...p.filter(m => m.id !== thinkingId),
        ...messages,
      ]);
    }, delay);
  };

  const handleSelectHelperService = (serviceId) => {
    const service = AI_HELPER_SERVICES.find(s => s.id === serviceId);
    if (!service) return;
    setSelectedHelperService(serviceId);
    setHelperDemoStep(null);
    setHelperPanelOpen(true);
    setDone(false);
    appendThinkingThenReply(
      {
        role: 'helper',
        type: service.id,
        text: `已呼唤 AI 学习帮手：${service.label}。${service.hint}。你可以直接输入问题，也可以先选中左侧某个笔记块。`,
      },
      700,
    );
  };

  const handleSelectionService = (serviceId) => {
    const service = AI_HELPER_SERVICES.find(s => s.id === serviceId);
    if (!service || !selectionMenu?.text) return;

    const selectedText = selectionMenu.text;
    setSelectedHelperService(serviceId);
    setHelperDemoStep(1);
    setHelperPanelOpen(false);
    setDone(false);
    setInput('');
    const demoMessages = buildHelperDemoMessages(service, selectedText);
    setChatMessages(p => [...p, demoMessages[0]]);
    appendThinkingThenReply(demoMessages.slice(1).filter(Boolean), 1000);
    setSelectionMenu(null);
  };

  const handleStart = () => {
    setSelectedHelperService(null);
    setHelperDemoStep(null);
    setStarted(true);
    setRound(0);
    setChatMessages([]);
    setDone(false);
    appendThinkingThenReply(
      { role:'coach', type:'question', text:'准备好开始思考训练了吗？我会围绕你的笔记内容，用苏格拉底式提问引导你深入理解。记住：我不会直接给你答案——但会让你发现自己的理解盲区。' },
      800,
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const nextInput = input.trim();
    setChatMessages(p => [...p, { role: 'user', text: nextInput }]); setInput('');
    if (activeHelperService) {
      const demoMessages = AI_HELPER_DEMOS[activeHelperService.id] || [];
      if (helperDemoStep !== null && helperDemoStep < demoMessages.length) {
        appendThinkingThenReply(demoMessages[helperDemoStep], 900);
        setHelperDemoStep(helperDemoStep + 1);
        return;
      }

      appendThinkingThenReply(
        {
          role: 'helper',
          type: activeHelperService.id,
          text: buildHelperResponse(activeHelperService, nextInput),
        },
        900,
      );
      return;
    }
    if (started && !done && round < COACH_PROMPTS.length) {
      appendThinkingThenReply(
        { role: 'coach', type: COACH_PROMPTS[round].type, text: COACH_PROMPTS[round].text },
        900,
      );
      setRound(round + 1);
    } else if (started && !done) {
      appendThinkingThenReply(
        { role:'coach', type:'success', text:'本轮思考训练完成！你完成了5轮追问。建议把这次思考链保存下来——它们是宝贵的认知资产。' },
        900,
      );
      setDone(true);
    } else {
      appendThinkingThenReply(
        {
          role: 'coach',
          type: 'question',
          text: `我先不急着给答案。你刚才说：“${nextInput.slice(0, 80)}${nextInput.length > 80 ? '...' : ''}”。\n\n你可以先补充两点：这个问题里你最不确定的概念是什么？你已经有哪些判断依据？`,
        },
        900,
      );
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file); setImagePreview(url);
    setChatMessages(p => [...p, { role:'user', text:'[上传了一张图片]', image: url }]);
    appendThinkingThenReply(
      { role:'coach', type:'question', text:'我看到了你上传的图片。能告诉我这张图里是什么内容吗？你希望我帮你分析什么？' },
      900,
    );
  };

  const typeLabel = {
    question:'理解检验',
    gap:'逻辑漏洞',
    challenge:'边界追问',
    compare:'概念辨析',
    apply:'应用迁移',
    success:'训练完成',
    correction:'纠错',
    concept:'概念解释',
    quote:'引用问答',
    zhToEn:'中译英',
    enToZh:'英译中',
    polish:'表达优化',
    expand:'补充',
    thinking:'思考中',
  };
  const typeColor = {
    question:'bg-[#E2EBF7] text-[#2C5282]',
    gap:'bg-[#fce4e4] text-[#c0392b]',
    challenge:'bg-[#F7ECD9] text-[#8A5A1A]',
    compare:'bg-[#E9E2F7] text-[#5B3FA8]',
    apply:'bg-[#D7EFE4] text-[#1A7A57]',
    success:'bg-[#10A37F] text-[#1F1F1F]',
    correction:'bg-[#fce4e4] text-[#c0392b]',
    concept:'bg-[#E2EBF7] text-[#2C5282]',
    quote:'bg-[#F7ECD9] text-[#8A5A1A]',
    zhToEn:'bg-[#E9E2F7] text-[#5B3FA8]',
    enToZh:'bg-[#D7EFE4] text-[#1A7A57]',
    polish:'bg-[#10A37F] text-[#1F1F1F]',
    expand:'bg-[#f3f4f6] text-[#4b5563]',
    thinking:'bg-[#f3f4f6] text-[#6b7280]',
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId);
  const canUseInput = true;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Left: Note editor 70% */}
      <div className="flex-1 flex flex-col pr-4 min-w-0">
        <PageHeader
          icon={ICON_THINKING}
          title="思考模式"
          description="AI 不会替你思考，但会逼你思考得更深"
          actions={
            <>
              <Button variant="ghost" onClick={askAboutThinking}>
                <Icon d={ICON_CHAT} className="h-4 w-4" />
                问 AI
              </Button>
              <Button variant="secondary" onClick={() => setHelperPanelOpen(true)}>AI 学习帮手</Button>
              {!started && <Button onClick={handleStart}>开始思维训练</Button>}
              {done && <Button onClick={handleStart}>再来一轮</Button>}
              <Button variant="ghost" onClick={() => navigate('/memory-mode')}>去记忆</Button>
            </>
          }
        />

        {/* Note selector + toolbar */}
        <div className="card flex-shrink-0 mb-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setShowSelector(!showSelector)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#f3f4f6] hover:bg-[#e5e7eb] transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
              {selectedNote ? `${noteTitle}` : '选择笔记...'}
            </button>
            {showSelector && (
              <div className="relative">
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-[#e5e7eb] z-50 max-h-60 overflow-y-auto">
                  {notes.map(n => (
                    <button key={n.id} onClick={() => { setSelectedNoteId(n.id); setShowSelector(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f9fafb] ${selectedNoteId === n.id ? 'bg-[#10A37F]/20 font-semibold' : ''}`}>
                      {n.title}
                      <span className="text-[10px] text-[#9ca3af] ml-2">{n.courseName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedNoteId && (
              <span className="flex items-center gap-1 ml-auto">
                {/* Save indicator */}
                {saving && <span className="text-[10px] text-[#9ca3af]">保存中...</span>}
                {!saving && lastSaved && <span className="text-[10px] text-[#9ca3af]">已保存 {lastSaved.toLocaleTimeString()}</span>}
                {!saving && dirty && <span className="text-[10px] text-[#f59e0b]">未保存</span>}
                <button onClick={() => handleSave(false)} disabled={!dirty || saving} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${dirty && !saving ? 'bg-[#10A37F] hover:bg-[#0D8B6C]' : 'bg-[#f3f4f6] text-[#9ca3af]'}`}>保存</button>
              </span>
            )}
          </div>

          {/* Toolbar */}
          {selectedNoteId && (
            <div className="flex items-center gap-1 flex-wrap border-t border-[#f3f4f6] pt-2">
              <button onClick={handleUndo} disabled={historyIdx <= 0} className="p-1.5 rounded-lg text-xs text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-30" title="撤销 Ctrl+Z">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
              </button>
              <button onClick={handleRedo} disabled={historyIdx >= history.length - 1} className="p-1.5 rounded-lg text-xs text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-30" title="重做 Ctrl+Y">
                <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
              </button>
              <span className="w-px h-5 bg-[#e5e7eb] mx-1"/>
              <button onClick={() => activeBlockId && insertFormat(activeBlockId, '**')} className="p-1.5 rounded-lg text-xs font-bold text-[#6b7280] hover:bg-[#f3f4f6]" title="加粗">B</button>
              <button onClick={() => activeBlockId && insertFormat(activeBlockId, '*')} className="p-1.5 rounded-lg text-xs italic text-[#6b7280] hover:bg-[#f3f4f6]" title="斜体">I</button>
              <span className="w-px h-5 bg-[#e5e7eb] mx-1"/>
              {BLOCK_TYPES.map(bt => (
                <button key={bt.label} onClick={() => {
                  if (!activeBlockId) return;
                  updateBlock(activeBlockId, 'type', bt.value, bt.level !== undefined ? { level: bt.level } : undefined);
                }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-[#f3f4f6] transition-colors ${activeBlockId && blocks.find(b => b.id === activeBlockId)?.type === bt.value && (bt.level === undefined || blocks.find(b => b.id === activeBlockId)?.level === bt.level) ? 'bg-[#10A37F]/30 text-[#1f2937]' : 'text-[#6b7280]'}`}>
                  {bt.label}
                </button>
              ))}
              <span className="w-px h-5 bg-[#e5e7eb] mx-1"/>
              <button onClick={() => { const idx = blocks.findIndex(b => b.id === activeBlockId); handleAddBlock(idx >= 0 ? idx : blocks.length - 1); }} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#6b7280] hover:bg-[#f3f4f6]">+ 添加块</button>
            </div>
          )}
        </div>

        {/* Block editor */}
        <div className="card flex-1 overflow-y-auto p-6 bg-[#f5f6f7]">
          {!selectedNoteId ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3">
                  <svg className="h-6 w-6 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625"/></svg>
                </div>
                <p className="text-sm text-[#A0A0A0]">选择一个笔记开始思考训练</p>
              </div>
            </div>
          ) : (
            <div className="max-w-[720px] min-h-full mx-auto bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-10">
              {blocks.map((block, idx) => {
                const info = blockDisplayInfo(block);
                const isEditing = activeBlockId === block.id;
                return (
                  <div key={block.id} className={`group relative rounded-xl transition-colors ${isEditing ? 'ring-2 ring-[#10A37F]/50 bg-[#FAFAFA]' : 'hover:bg-[#f9fafb]'}`} onClick={() => setActiveBlockId(block.id)}>
                    <div className="flex items-center gap-1 px-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${info.cls} ${block.type === 'heading' ? 'text-base' : block.type === 'formula' ? 'font-mono text-sm' : 'text-xs'} text-[#9ca3af] bg-[#f3f4f6]`}>{info.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} className="ml-auto p-0.5 rounded text-[#9ca3af] hover:text-[#c0392b] hover:bg-[#fce4e4]">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <textarea
                      ref={el => { blockRefs.current[block.id] = el; }}
                      value={block.content}
                      onChange={e => updateBlock(block.id, 'content', e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onMouseUp={(e) => handleTextSelection(e, block.id)}
                      onKeyUp={(e) => handleTextSelection(e, block.id)}
                      className={`w-full bg-transparent px-3 pb-2 outline-none resize-none ${block.type === 'heading' ? `font-bold ${block.level === 1 ? 'text-xl' : block.level === 2 ? 'text-lg' : 'text-base'}` : block.type === 'formula' ? 'font-mono text-sm bg-[#FAFAFA] rounded-lg' : 'text-sm'}`}
                      placeholder={block.type === 'heading' ? '输入标题...' : '输入内容...'}
                      rows={block.type === 'heading' ? 1 : block.content ? Math.max(2, Math.ceil(block.content.length / 60)) : 2}
                    />
                    <button onClick={() => handleAddBlock(idx)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-[#10A37F] text-[10px] flex items-center justify-center shadow-sm">+</button>
                  </div>
                );
              })}
            </div>
          )}
          {imagePreview && <div className="mt-4"><p className="text-xs text-[#A0A0A0] mb-2">上传的图片</p><img src={imagePreview} alt="uploaded" className="max-w-full max-h-64 rounded-2xl border border-[#ECECEC]" /></div>}
        </div>
      </div>

      {selectionMenu && (
        <div
          className="fixed z-[80] w-[280px] rounded-2xl bg-white border border-[#ECECEC] shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-3"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#7B7B7B] mb-1">对选中文本使用 AI</p>
              <p className="text-xs text-[#1F1F1F] truncate">“{selectionMenu.text}”</p>
            </div>
            <button onClick={() => setSelectionMenu(null)} className="w-6 h-6 rounded-lg text-[#9CA3AF] hover:text-[#1F1F1F] hover:bg-[#f3f4f6] flex items-center justify-center">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {AI_HELPER_SERVICES.map(service => (
              <button
                key={service.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectionService(service.id)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${typeColor[service.id]} hover:brightness-95`}
                title={service.hint}
              >
                {service.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right: AI Coach 30% */}
      <div className="w-[420px] flex-shrink-0 flex flex-col">
        <div className="card flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-[#ECECEC] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#E9E2F7]">
                <svg className="h-5 w-5 text-[#5B3FA8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-[#1F1F1F]">{activeHelperService ? `AI 学习帮手 · ${activeHelperService.label}` : 'AI 苏格拉底教练'}</h3>
                <p className="text-[10px] text-[#A0A0A0]">{activeHelperService ? activeHelperService.hint : '理性引导 | 深度思辨'}</p>
              </div>
              <button onClick={() => setHelperPanelOpen(v => !v)} className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[#f5f5f5] text-[#6b7280] hover:bg-[#ECECEC] transition-colors">
                {helperPanelOpen ? '收起服务' : 'AI服务'}
              </button>
            </div>
            {helperPanelOpen && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {AI_HELPER_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectHelperService(service.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      selectedHelperService === service.id
                        ? 'border-[#10A37F] bg-[#10A37F]/20'
                        : 'border-[#ECECEC] bg-[#fafafa] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#1F1F1F]">{service.label}</span>
                      <span className={`badge text-[9px] ${typeColor[service.id]}`}>{service.short}</span>
                    </div>
                    <p className="text-[10px] text-[#7B7B7B] leading-relaxed">{service.hint}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {!started && chatMessages.length === 0 && <div className="flex items-center justify-center h-full text-center"><div><div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-3"><svg className="h-6 w-6 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25"/></svg></div><p className="text-sm text-[#A0A0A0]">可以开始思维训练，<br/>也可以随时选择上方 AI 助学服务</p></div></div>}
            {chatMessages.map((m,i)=>(
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[90%] ${m.role !== 'user' ? 'w-full' : ''}`}>
                  {m.role !== 'user' && m.type && <span className={`badge text-[9px] mb-1 ${typeColor[m.type]}`}>{typeLabel[m.type]}</span>}
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${m.role==='user'?'bg-[#10A37F]/20 text-[#1F1F1F]':'bg-[#f5f5f5] text-[#4a4a4a]'}`}>
                    {m.image && <img src={m.image} alt="upload" className="max-w-full max-h-40 rounded-xl mb-2"/>}
                    {m.isThinking ? (
                      <span className="inline-flex items-center gap-1 text-[#7B7B7B]">
                        {m.text}
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A0A0A0] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A0A0A0] animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A0A0A0] animate-bounce [animation-delay:240ms]" />
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.text}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canUseInput && (
            <div className="p-4 border-t border-[#ECECEC] flex items-center gap-2 flex-shrink-0">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
              <button onClick={()=>{setIsListening(!isListening);if(!isListening){setInput('');setTimeout(()=>{setInput('我认为监督学习的核心是通过标注数据...');setIsListening(false);},1800);}}}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isListening?'bg-[#c0392b] text-white shadow-[0_0_0_4px_rgba(192,57,43,0.2)]':'bg-[#f5f5f5] text-[#7B7B7B] hover:bg-[#ECECEC]'}`}>
                {isListening
                  ? <span className="flex items-center gap-0.5"><span className="w-1 h-3 bg-white rounded-full"/><span className="w-1 h-4 bg-white rounded-full"/><span className="w-1 h-2.5 bg-white rounded-full"/></span>
                  : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>
                }
              </button>
              <button onClick={()=>fileRef.current?.click()} className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center text-[#7B7B7B] hover:bg-[#ECECEC] transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/></svg>
              </button>
              <div className="flex-1 min-w-0">
                {activeHelperService && <div className="mb-1 text-[10px] font-semibold text-[#5B3FA8]">当前服务：{activeHelperService.label}</div>}
                <input className="w-full py-2.5 px-4 rounded-xl bg-[#f5f5f5] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#E9E2F7]/40" placeholder={activeHelperService?.placeholder || '输入你的回答...'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
              </div>
              <button onClick={handleSend} className="w-10 h-10 rounded-xl bg-[#E9E2F7] flex items-center justify-center text-[#5B3FA8] hover:bg-[#D3C6F0] transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThinkingMode;
