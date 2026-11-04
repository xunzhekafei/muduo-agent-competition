import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const TOOL_LABELS = {
  list_courses: '查看课程',
  search_notes: '检索笔记',
  get_note: '读取笔记',
  get_overview: '查看学习总览',
  list_due_cards: '查看到期卡片',
  generate_memory_cards: '生成记忆卡片',
  create_note: '创建笔记',
  run_feynman: '开始费曼讲解',
  feynman_add_question: '费曼追问',
  evaluate_feynman: '费曼评估',
  ask_thinking_question: '苏格拉底追问',
  schedule_review: 'SM-2 复习排期',
  get_mastery: '查看掌握度',
  search_knowledge: '知识库检索',
};

// 工具 → 对应功能页，实现「对话 → 工具」深链
const TOOL_ROUTES = {
  list_courses: '/dashboard',
  search_notes: '/note-management',
  get_note: '/note-management',
  get_overview: '/dashboard',
  list_due_cards: '/memory-mode',
  generate_memory_cards: '/memory-mode',
  create_note: '/note-management',
  run_feynman: '/feynman-mode',
  feynman_add_question: '/feynman-mode',
  evaluate_feynman: '/feynman-mode',
  ask_thinking_question: '/thinking-mode',
  schedule_review: '/memory-mode',
  get_mastery: '/dashboard',
  search_knowledge: '/note-management',
};

function Arrow({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}

/**
 * Agent 工具调用轨迹。让「Agent 在工作」对用户和评委可见；
 * 每个工具条目可点击深链到对应功能页。
 */
const ToolTrace = ({ trace }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  const openTool = (tool) => {
    const route = TOOL_ROUTES[tool];
    if (route) navigate(route);
  };

  return (
    <div className="mt-3 rounded-xl border border-black/[0.06] overflow-hidden bg-[#FAFAFA]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-black/[0.02] transition-colors"
      >
        <span className="text-[#10A37F]"><Arrow open={open} /></span>
        <span className="text-xs font-semibold text-[#10A37F]">
          已执行 {trace.length} 个工具
        </span>
        <span className="text-[11px] text-[#9CA3AF] truncate">
          {trace.map((item) => TOOL_LABELS[item.tool] ?? item.tool).join(' → ')}
        </span>
      </button>

      {open && (
        <ul className="px-3.5 pb-3 space-y-2 border-t border-black/[0.05] pt-2.5">
          {trace.map((item) => (
            <li key={item.step} className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className={item.ok ? 'text-[#10A37F]' : 'text-[#d06b6b]'}>
                  {item.ok ? '✓' : '✗'}
                </span>
                <button
                  type="button"
                  onClick={() => openTool(item.tool)}
                  disabled={!TOOL_ROUTES[item.tool]}
                  title={TOOL_ROUTES[item.tool] ? '打开对应功能' : undefined}
                  className={`font-semibold text-[#4a4a4a] transition-colors ${
                    TOOL_ROUTES[item.tool] ? 'hover:text-[#10A37F]' : ''
                  }`}
                >
                  {TOOL_LABELS[item.tool] ?? item.tool}
                </button>
                {TOOL_ROUTES[item.tool] && (
                  <span className="text-[10px] text-[#9CA3AF]">↗</span>
                )}
                <code className="text-[10px] text-[#9CA3AF] truncate">
                  {Object.keys(item.args || {}).length > 0 ? JSON.stringify(item.args) : ''}
                </code>
              </div>
              <p className="mt-0.5 pl-5 text-[11px] leading-relaxed text-[#6B7280] whitespace-pre-wrap break-words">
                {item.result}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ToolTrace;
