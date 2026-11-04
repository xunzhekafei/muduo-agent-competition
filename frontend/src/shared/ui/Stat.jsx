import React from 'react';
import Card from './Card';

/**
 * 指标卡：标签 + 大数值 + 可选说明，用于总览类模块。
 */
const Stat = ({ label, value, hint, icon }) => (
  <Card padded className="flex flex-col justify-between min-h-[120px]">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-ink-500">{label}</span>
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-surface-sunken text-ink-700 flex items-center justify-center">
          {icon}
        </div>
      )}
    </div>
    <div>
      <p className="text-3xl font-semibold text-ink-900 tracking-tight leading-none">{value}</p>
      {hint && <p className="text-xs text-ink-400 mt-2">{hint}</p>}
    </div>
  </Card>
);

export default Stat;
