import React from 'react';

const CONCEPT_NODES = [
  { id: 1, status: 'mastered', label: '极限', x: '25%', y: '22%' },
  { id: 2, status: 'mastered', label: '导数', x: '75%', y: '22%' },
  { id: 3, status: 'mastered', label: '积分', x: '33%', y: '78%' },
  { id: 4, status: 'reviewing', label: '微分', x: '66%', y: '78%' },
  { id: 5, status: 'reviewing', label: '级数', x: '14%', y: '50%' },
  { id: 6, status: 'weak', label: '证明', x: '86%', y: '50%' },
];

const statusStyles = {
  mastered:  { bg: 'bg-sage-100', border: 'border-sage-400', text: 'text-sage-700' },
  reviewing: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  weak:      { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-600' },
};

const KnowledgeGraphCard = () => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">知识图谱</h2>
        <span className="text-xs text-ink-tertiary">高等数学 · 6 个概念</span>
      </div>

      <div className="relative h-72">
        {/* 中心节点 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[72px] h-[72px] rounded-3xl bg-brand-50 border-2 border-brand-300
                        flex items-center justify-center text-sm font-semibold text-brand-700 z-10
                        shadow-sm">
          高等数学
        </div>

        {/* 概念子节点 */}
        {CONCEPT_NODES.map((node) => {
          const s = statusStyles[node.status];
          return (
            <div
              key={node.id}
              className={`absolute w-14 h-14 rounded-2xl flex items-center justify-center
                         text-xs font-medium cursor-pointer z-10
                         border-2 ${s.bg} ${s.border} ${s.text}
                         hover:scale-110 transition-transform duration-200 shadow-sm`}
              style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
              title={node.label}
            >
              {node.label}
            </div>
          );
        })}

        {/* 连接线 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {[[50,50,25,22],[50,50,75,22],[50,50,33,78],[50,50,66,78],[50,50,14,50],[50,50,86,50]].map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
              stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4 3" />
          ))}
        </svg>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50">
        {[
          { status: 'mastered', label: '已掌握' },
          { status: 'reviewing', label: '复习中' },
          { status: 'weak', label: '薄弱项' },
        ].map((item) => {
          const s = statusStyles[item.status];
          return (
            <div key={item.status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border-2 ${s.border} ${s.bg}`} />
              <span className="text-xs text-ink-secondary">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KnowledgeGraphCard;
