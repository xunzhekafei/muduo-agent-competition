import React, { useState, useEffect } from 'react';
import { fetchQuickNotesList } from '../../api/quickNotes';

const TYPE_META = {
  timeline: { label: '时间流速记', icon: '⏱', color: '#E9E2F7', text: '#5B3FA8' },
  regular: { label: '普通速记', icon: '📝', color: '#D7EFE4', text: '#1A7A57' },
};

const QuickNotesHub = ({ onNewTimeline, onNewRegular, onOpenNote }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadList = () => {
    fetchQuickNotesList()
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[#9ca3af]">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* 标题 */}
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-[#1F1F1F]">速记模式</h1>
        <p className="text-sm text-[#7B7B7B] mt-1">选择一种方式，快速记录学习内容</p>
      </div>

      {/* 两种新建入口 */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            key: 'timeline',
            title: '时间流速记',
            desc: '录音 + 时间线记录',
            detail: '适合课堂、讲座场景，边听边记，AI 自动结构化整理',
            action: onNewTimeline,
            color: '#E9E2F7',
            border: '#D3C6F0',
          },
          {
            key: 'regular',
            title: '普通速记',
            desc: 'Markdown 编辑器',
            detail: '适合自学、复习场景，自由书写，支持 Markdown 格式',
            action: onNewRegular,
            color: '#D7EFE4',
            border: '#BFE5D9',
          },
        ].map((card) => (
          <button
            key={card.key}
            onClick={card.action}
            className="p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 hover:shadow-md"
            style={{ borderColor: card.border, backgroundColor: '#fff' }}
          >
            <h3 className="text-lg font-bold text-[#1F1F1F] mb-1">{card.title}</h3>
            <p className="text-xs font-semibold mb-2" style={{ color: card.border }}>{card.desc}</p>
            <p className="text-xs text-[#7B7B7B] leading-relaxed mb-4">{card.detail}</p>
            <span className="inline-block px-4 py-2 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F]">
              + 新建
            </span>
          </button>
        ))}
      </div>

      {/* 历史记录 */}
      {items.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#1F1F1F] mb-3">历史速记</h2>
          <div className="space-y-2">
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.regular;
              return (
                <button
                  key={item.id}
                  onClick={() => onOpenNote(item.id, item.type, item.title)}
                  className="w-full card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-xl mt-0.5">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#1F1F1F] truncate">{item.title}</h3>
                        <p className="text-xs text-[#7B7B7B] mt-0.5">
                          {item.courseName} · {item.itemCount} 条记录
                          {item.duration && ` · ${item.duration}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: meta.color, color: meta.text }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-[#A0A0A0]">{item.updatedAtLabel}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#fce4e4] text-[#A0A0A0] hover:text-[#c0392b] transition-all flex-shrink-0 ml-2"
                      title="删除"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickNotesHub;
