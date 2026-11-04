import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMemoryLibrary } from '../../api/memory';
import { PageHeader, Button, Loading, EmptyState, Icon } from '../../shared/ui';
import { useAgent } from '../agent/AgentContext';

const ICON_MEMORY = 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
const ICON_CHAT = 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z';

const STATUS_MAP = {
  none: { label: '未生成', bg: '#f3f4f6', text: '#7B7B7B' },
  pending: { label: '未开始', bg: '#fce4e4', text: '#c0392b' },
  active: { label: '记忆中', bg: '#E2EBF7', text: '#2C5282' },
  completed: { label: '已完成', bg: '#D7EFE4', text: '#1A7A57' },
};

const CYCLE_LABELS = {
  cram: '考前冲刺',
  standard: '标准学习',
  longterm: '长期掌握',
};

/** 根据到期情况计算展示状态：当天到期且未完成 → pending */
function resolveStatus(item) {
  if (item.status === 'none') return 'none';
  if (item.daysUntilNext === 0) return 'pending';
  return item.status;
}

const MemoryLibrary = ({ onEnterNote, onStartNew }) => {
  const { askAI } = useAgent();
  const navigate = useNavigate();
  const askAboutMemory = () => {
    askAI('根据我的记忆卡片和复习进度，帮我看看今天最该复习什么、哪些知识点快忘了');
    navigate('/agent');
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('全部');

  useEffect(() => {
    setLoading(true);
    fetchMemoryLibrary()
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === '全部') return items;
    return items.filter((i) => resolveStatus(i) === filter);
  }, [items, filter]);

  const stats = useMemo(() => {
    let none = 0, pending = 0, active = 0, completed = 0;
    items.forEach((i) => {
      const s = resolveStatus(i);
      if (s === 'none') none++;
      else if (s === 'pending') pending++;
      else if (s === 'active') active++;
      else if (s === 'completed') completed++;
    });
    return { none, pending, active, completed, total: items.length };
  }, [items]);

  const getUrgencyBadge = (item) => {
    if (item.status === 'none') {
      return { text: '待生成', color: '#f3f4f6', textColor: '#7B7B7B' };
    }
    if (item.daysUntilNext === 0) {
      return { text: '今天该复习了', color: '#fce4e4', textColor: '#c0392b' };
    }
    if (item.status === 'completed') {
      return { text: `${item.daysUntilNext} 天后复习`, color: '#D7EFE4', textColor: '#1A7A57' };
    }
    if (item.daysUntilNext === 1) {
      return { text: '明天复习', color: '#F7ECD9', textColor: '#8A5A1A' };
    }
    return { text: `还有 ${item.daysUntilNext} 天复习`, color: '#E2EBF7', textColor: '#2C5282' };
  };

  if (loading) {
    return <Loading className="min-h-[40vh]" />;
  }

  const FILTER_KEYS = ['全部', 'none', 'pending', 'active', 'completed'];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ICON_MEMORY}
        title="记忆模式"
        description="管理所有笔记的记忆卡片与复习计划"
        actions={
          <>
            <Button variant="ghost" onClick={askAboutMemory}>
              <Icon d={ICON_CHAT} className="h-4 w-4" />
              问 AI
            </Button>
            <Button onClick={onStartNew}>新建记忆</Button>
          </>
        }
      />

      {/* stat bar */}
      <div className="card p-5">
        <div className="grid grid-cols-5 gap-3">
          {[
            { key: '全部', label: '全部笔记', value: stats.total, color: '#F7ECD9' },
            { key: 'none', label: '未生成', value: stats.none, color: '#f3f4f6' },
            { key: 'pending', label: '未开始', value: stats.pending, color: '#fce4e4' },
            { key: 'active', label: '记忆中', value: stats.active, color: '#E2EBF7' },
            { key: 'completed', label: '已完成', value: stats.completed, color: '#D7EFE4' },
          ].map((s, i) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className="p-3 rounded-2xl text-left transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: s.color }}
            >
              <p className="text-[10px] text-[#1F1F1F]/60 font-semibold uppercase">{s.label}</p>
              <p className="text-2xl font-bold text-[#1F1F1F] mt-1">{s.value}</p>
            </button>
          ))}
        </div>
      </div>

      {/* note list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={ICON_MEMORY}
              title={filter === '全部' ? '暂无笔记' : `没有「${STATUS_MAP[filter]?.label || filter}」状态的笔记`}
              description={filter === '全部' ? '点击「新建记忆」开始生成记忆卡片' : undefined}
              action={filter === '全部' ? <Button onClick={onStartNew}>新建记忆</Button> : undefined}
            />
          </div>
        ) : (
          filtered.map((item) => {
            const displayStatus = resolveStatus(item);
            const status = STATUS_MAP[displayStatus] || STATUS_MAP.none;
            const urgency = getUrgencyBadge(item);
            const progress = item.totalCards > 0 ? Math.round((item.reviewedCards / item.totalCards) * 100) : 0;

            return (
              <button
                key={item.noteId}
                onClick={() => onEnterNote({ noteId: item.noteId, status: item.status, title: item.noteTitle, course: item.courseName })}
                className="w-full card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#1F1F1F]">{item.noteTitle}</h3>
                    <p className="text-xs text-[#7B7B7B] mt-0.5">{item.courseName}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                </div>

                {item.status !== 'none' && (
                  <>
                    {/* progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#7B7B7B]">
                          复习进度 {item.reviewedCards}/{item.totalCards} 张
                        </span>
                        <span className="text-[10px] font-semibold text-[#1F1F1F]">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#f3f4f6] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: '#10A37F' }} />
                      </div>
                    </div>

                    {/* meta row */}
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-[#7B7B7B]">周期: {CYCLE_LABELS[item.cycle] || '标准学习'}</span>
                      {item.daysUntilNext != null && (
                        <span
                          className="px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: urgency.color, color: urgency.textColor }}
                        >
                          {urgency.text}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MemoryLibrary;
