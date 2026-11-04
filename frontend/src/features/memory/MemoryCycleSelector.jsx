import React from 'react';

const CYCLES = [
  {
    key: 'cram',
    title: '考前冲刺',
    desc: '30天内考试',
    schedule: '1 → 2 → 4 → 7 → 14 天',
    color: '#fce4e4',
    border: '#e8c8c8',
    text: '#c0392b',
  },
  {
    key: 'standard',
    title: '标准学习',
    desc: '日常课程',
    schedule: '1 → 3 → 7 → 15 → 30 → 60 天',
    color: '#E2EBF7',
    border: '#b8cff0',
    text: '#2C5282',
    recommended: true,
  },
  {
    key: 'longterm',
    title: '长期掌握',
    desc: '考研 / 核心课',
    schedule: '1 → 3 → 7 → 15 → 30 → 90 → 180 天',
    color: '#E9E2F7',
    border: '#D3C6F0',
    text: '#5B3FA8',
  },
];

const MemoryCycleSelector = ({ selected, onSelect, onConfirm, onCancel }) => {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-[#1F1F1F] mb-1">选择记忆周期</h2>
      <p className="text-sm text-[#7B7B7B] mb-5">
        根据你的学习目标选择合适的复习节奏
      </p>

      <div className="space-y-3 mb-6">
        {CYCLES.map((c) => {
          const isSelected = selected === c.key;
          return (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className="w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: isSelected ? c.color : '#fff',
                borderColor: isSelected ? c.border : '#ECECEC',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#1F1F1F]">
                  {c.title}
                  {c.recommended && (
                    <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#10A37F] text-[#1F1F1F]">
                      推荐
                    </span>
                  )}
                </span>
                <span className="text-xs text-[#7B7B7B]">{c.desc}</span>
              </div>
              <p className="text-xs font-mono text-[#7B7B7B]">{c.schedule}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={!selected}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#10A37F] text-[#1F1F1F] hover:bg-[#0D8B6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          确认并开始记忆
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#7B7B7B] hover:bg-black/[0.03] transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export { CYCLES };
export default MemoryCycleSelector;
