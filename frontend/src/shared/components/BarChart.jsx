import React from 'react';

const MOCK_DATA = [
  { day: '周一', 课程学习: 1.0, 费曼练习: 0.5, 记忆复习: 0.6, 思考推导: 0.4 },
  { day: '周二', 课程学习: 0.8, 费曼练习: 0.6, 记忆复习: 0.7, 思考推导: 0.5 },
  { day: '周三', 课程学习: 0.6, 费曼练习: 0.4, 记忆复习: 0.8, 思考推导: 0.3 },
  { day: '周四', 课程学习: 1.0, 费曼练习: 0.5, 记忆复习: 0.7, 思考推导: 0.5 },
  { day: '周五', 课程学习: 0.8, 费曼练习: 0.6, 记忆复习: 0.5, 思考推导: 0.4 },
  { day: '周六', 课程学习: 0.5, 费曼练习: 0.3, 记忆复习: 0.7, 思考推导: 0.4 },
  { day: '周日', 课程学习: 0.3, 费曼练习: 0, 记忆复习: 0.6, 思考推导: 0.5 },
];

const SERIES = [
  { key: '课程学习', color: '#10A37F' },
  { key: '费曼练习', color: '#63B3ED' },
  { key: '记忆复习', color: '#F0A040' },
  { key: '思考推导', color: '#B794F4' },
];

const BarChart = ({ data = MOCK_DATA }) => {
  const maxTotal = Math.max(...data.map(d => SERIES.reduce((s, k) => s + (d[k.key] || 0), 0)));
  const gridMax = Math.ceil(maxTotal);
  const gridLines = Array.from({ length: gridMax + 1 }, (_, i) => i); // [0, 1, 2, 3]
  const chartH = 160; // bar area height in px

  return (
    <div className="flex items-end gap-3 relative" style={{ height: '208px', paddingLeft: '32px', paddingRight: '8px' }}>
      {/* Y-axis labels + grid lines combined */}
      <div className="absolute left-0 right-0 top-0 h-full flex flex-col-reverse pointer-events-none" style={{ paddingBottom: '28px' }}>
        {gridLines.map(v => (
          <div key={v} className="flex items-center" style={{ height: `${100 / gridMax}%` }}>
            <span className="text-[10px] text-[#b0b0b0] w-7 text-right pr-1.5 flex-shrink-0 leading-none">{v}h</span>
            <div className={`flex-1 ${v === 0 ? 'border-t border-[#d0d0d0]' : 'border-t border-[#f0f0f0]'}`} />
          </div>
        ))}
      </div>

      {/* Bars */}
      {data.map((item) => {
        const total = SERIES.reduce((s, k) => s + (item[k.key] || 0), 0);
        const barH = gridMax > 0 ? (total / gridMax) * chartH : 0;
        return (
          <div key={item.day} className="flex-1 flex flex-col items-center z-10" style={{ paddingBottom: '28px' }}>
            <div
              className="w-4/5 mx-auto rounded-t-[6px] overflow-hidden flex flex-col justify-end"
              style={{ height: `${Math.max(0, barH)}px` }}
            >
              {SERIES.map(s => {
                const h = item[s.key] || 0;
                if (h === 0) return null;
                return (
                  <div
                    key={s.key}
                    className="w-full transition-all duration-500 ease-out"
                    style={{
                      height: `${(h / gridMax) * chartH}px`,
                      backgroundColor: s.color,
                      minHeight: h > 0 ? '3px' : '0',
                    }}
                    title={`${item.day} ${s.key}: ${h}h`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-medium text-[#7B7B7B] mt-1.5">{item.day}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
